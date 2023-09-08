const metalsmith  = require('metalsmith');
const inplace = require('metalsmith-in-place');
const filter = require('metalsmith-filter');
const fs = require('fs');
const async = require('async');
let apiVersion;
let applicationClass;
let defaultFieldSet;
let output;

function run(configPath = 'soc-config.json', outputFolder = 'results') {
  let rawConfig = fs.readFileSync(configPath);
  let config = JSON.parse(rawConfig);
  output = outputFolder;
  generateSoc(config);
}

function doTemplating(templatingConfig, cb){
  metalsmith('.')
    .metadata(templatingConfig.variables)
    .source('templates')
    .destination(templatingConfig.outputFolder)
    .clean(false)
    .use(filter(templatingConfig.templateName))
    .use(inplace())
    .build(function(err) {
      if (err) {
        throw err;
      } else {
        console.log(templatingConfig);
        const newFile = templatingConfig.outputFolder + '/' + templatingConfig.className + templatingConfig.extension;
        const oldFile = templatingConfig.outputFolder + '/' + templatingConfig.oldFileName;
        fs.renameSync(oldFile, newFile);
        if(cb) {
          console.log(cb);
          cb();
        }
      }
    });
}
async function generateSoc(config) {
  let agregados = {dataLayer:[], domainLayer:[], serviceLayer:[]};
  apiVersion = config.apiVersion;
  applicationClass = config.applicationClass;
  defaultFieldSet = config.defaultFieldset;
  for(let i = 0; i < config.objects.length; i++) {
    let object = config.objects[i];
    console.log('iteration', object);
    let promise = new Promise(resolve => {
      agregados.dataLayer.push(createSelectorLayer(object, () => {
        agregados.domainLayer.push(createDomainLayer(object, () => {
          agregados.serviceLayer.push(createServiceLayer(object, () => {
            createResourceLayer(object, () => resolve());
          }));
        }));
      }));
    })
    await promise;
  }
}

function createSelectorLayer(object, cb) {
  //crear configuracion clase
  //generar interface
  //generar clase
  if(object.createDataLayer) {
    const interfaceName = object.interfaceName + 'Selector';
    //1. Selector interface configuration
    const interfaceVariables = {
      interfaceName : interfaceName,
      objecApiName : object.apiName
    }
    const interfaceConfig = getConfig(
      true,
      'Selector',
      object.apiName.indexOf('__mdt') !== -1 ? 'SelectorMDTInterface.cls.njk' : 'SelectorInterface.cls.njk',
      interfaceVariables,
      object,
      output
    );
    //2. Selector class configuration
    const selectorVariables = {
      objecApiName : object.apiName,
      className : `${object.className}Selector`,
      interfaceName : interfaceName,
      applicationClass : applicationClass,
      defaultFieldset : defaultFieldSet,
      fieldsToInclude : getFieldsToInclude(object.apiName, object.fieldsToInclude)
    };
    const selectorConfig = getConfig(
      false,
      'Selector',
      object.apiName.indexOf('__mdt') !== -1 ? 'SelectorMDT.cls.njk' : 'Selector.cls.njk',
      selectorVariables,
      object,
      output
    );
    //Create interface
    createClassFiles(interfaceConfig,() => {
      createClassFiles(selectorConfig, cb);}
    );
    
  }
  return 'sample';
}

function createDomainLayer(object, cb) {
  if(object.createDomainLayer) {
    const interfaceName = object.interfaceName;
    //Domain interface configuration
    const interfaceVariables = {
      interfaceName : interfaceName,
      objecApiName : object.apiName
    }
    const interfaceConfig = getConfig(
      true,
      '',
      'DomainInterface.cls.njk',
      interfaceVariables,
      object,
      output
    );
    //Helper class configuration
    const helperName = `${object.className}Helper`;
    const helperVariables = {
      className : helperName
    }
    const helperConfig = getConfig(
      false,
      'Helper',
      'Helper.cls.njk',
      helperVariables,
      object,
      output
    );
    //Domain class configuration
    const domainVariables = {
      objecApiName : object.apiName,
      className : `${object.className}`,
      interfaceName : interfaceName,
      applicationClass : applicationClass,
      helperName : helperName
    };
    const domainConfig = getConfig(
      false,
      '',
      'Domain.cls.njk',
      domainVariables,
      object,
      output
    );
    createClassFiles(interfaceConfig,() => {
      createClassFiles(helperConfig,() =>  {
        createClassFiles(domainConfig, cb);
      }
      );}
    );
  }
  return 'sapmle2';
}

function createServiceLayer(object, cb) {
  if(object.createServiceLayer) {
    const interfaceName = `${object.interfaceName}Service`;
    const helperName = `${object.className}ServiceHelper`;
    //Domain interface configuration
    const interfaceVariables = {
      interfaceName : interfaceName
    }
    const interfaceConfig = getConfig(
      true,
      'Service',
      'ServiceInterface.cls.njk',
      interfaceVariables,
      object,
      output
    );
    //Helper class configuration
    const helperVariables = {
      className : helperName
    }
    const helperConfig = getConfig(
      false,
      'ServiceHelper',
      'Helper.cls.njk',
      helperVariables,
      object,
      output
    );
    //ServiceImpl class configuration
    const serviceImplVariables = {
      className : `${object.className}ServiceImpl`,
      interfaceName: interfaceName,
      helperName: helperName
    }
    const serviceImplConfig = getConfig(
      false,
      'ServiceImpl',
      'ServiceImpl.cls.njk',
      serviceImplVariables,
      object,
      output
    );
    //Service class configuration
    const serviceVariables = {
      className : `${object.className}Service`,
      interfaceName : interfaceName,
      applicationClass : applicationClass
    };
    const serviceConfig = getConfig(
      false,
      'Service',
      'Service.cls.njk',
      serviceVariables,
      object,
      output
    );
    createClassFiles(interfaceConfig,() => {
      createClassFiles(helperConfig,() =>  {
        createClassFiles(serviceImplConfig, () => {
          createClassFiles(serviceConfig, cb);
        });
      }
      );}
    );
  }
  return 'algo';
}

function createResourceLayer(object, cb) {
  if(object.createResourceLayer) {
    const resourceVariables = {
      className : `${object.className}Resources`,
      resourceName: object.resourceUrlMapping
    }
    const resourceConfig = getConfig(
      false,
      'Resources',
      'Resource.cls.njk',
      resourceVariables,
      object,
      output
    );
    createClassFiles(resourceConfig, cb);
  }
}

function createApplicationLayer() {
  //crear configuracion
  //generar clase
}
function createClassFiles(templatingConfig, cb){
  //crear el fichero de la clase
  doTemplating(templatingConfig, () => 
    doTemplating({
      className: templatingConfig.className,
      extension: '-meta.xml',
      outputFolder : templatingConfig.outputFolder,
      templateName : 'ClassMeta.xml.njk',
      variables:{
        apiVersion:apiVersion,
        className:templatingConfig.className
      },
      oldFileName : 'ClassMeta.xml'
  }, cb));
}

function getFieldsToInclude(objectApiName, fieldsToInclude) {
  const fields = fieldsToInclude.split(',');
  let fieldsString = "";
  if(fields) {
    for(let i = 0; i < fields.length; i++) {
      if(i === 0) {
        fieldsString += `${objectApiName}.${fields[i]}`;
      } else {
        fieldsString += `,\n\t\t\t${objectApiName}.${fields[i]}`;
      }
    }
  } else {
    fieldsString += `${objectApiName}.Id,\n`;
    fieldsString += `${objectApiName}.Name`;
  }
  return fieldsString;
}

function getConfig(isInterface, sufix, template, variables, object, outputFolder) {
  const templatingConfig = {}
  templatingConfig.extension = '.cls';
  templatingConfig.variables = variables;
  templatingConfig.className = `${isInterface ? object.interfaceName : object.className}${sufix}`;
  templatingConfig.outputFolder = outputFolder;
  templatingConfig.templateName = template;
  templatingConfig.oldFileName = template.slice(0, -4);
  templatingConfig.apiVersion = apiVersion;
  return templatingConfig;
}

module.exports = {
    run
};