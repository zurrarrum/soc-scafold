const metalsmith  = require('metalsmith');
const inplace = require('metalsmith-in-place');
const filter = require('metalsmith-filter');
const fs = require('fs');
const path = require('path');
const moveFile = require('move-file');
let apiVersion;
let applicationClass;
let defaultFieldSet;
let output;
let generateApplicationLayer;

function run(configPath = 'soc-config.json', outputFolder = 'results') {
  let rawConfig = fs.readFileSync(configPath);
  let config = JSON.parse(rawConfig);
  output = outputFolder;
  generateSoc(config);
}

async function generateSoc(config) {
  let appLayer = {dataLayer:[], domainLayer:[], serviceLayer:[]};
  apiVersion = config.apiVersion;
  applicationClass = config.applicationClass;
  defaultFieldSet = config.defaultFieldset;
  generateApplicationLayer = config.generateApplicationLayer;
  for(let i = 0; i < config.objects.length; i++) {
    let object = config.objects[i];
    console.log('Processing object', object);
    let dataLayerResult = await createSelectorLayer(object);
    let domainLayerResult = await createDomainLayer(object);
    let serviceLayerResult = await createServiceLayer(object);
    await createResourceLayer(object);
    if (dataLayerResult) {
      appLayer.dataLayer.push(dataLayerResult);
    }
    if (domainLayerResult) {
      appLayer.domainLayer.push(domainLayerResult);
    }
    if (serviceLayerResult) {
      appLayer.serviceLayer.push(serviceLayerResult);
    }
  }
  createApplicationLayer(appLayer, config.objects);
}

function createSelectorLayer(object) {
  console.log('***********Executing Data Layer***********');
  if(object.createDataLayer) {
    const interfaceName = object.interfaceName + 'Selector';
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
    const selectorVariables = {
      objecApiName : object.apiName,
      className : `${object.className}Selector`,
      interfaceName : interfaceName,
      applicationClass : applicationClass,
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
    return new Promise(resolve => {
      console.log('Creating Selector Interface ...');
      createClassFiles(interfaceConfig,() => {
        console.log('Creating Selector Class ...');
        createClassFiles(selectorConfig, () => resolve(`${object.apiName}.sobjectType =\> ${object.className}Selector.class`));
      });
    });
  } else {
    console.log('Data Layer proccess skipped');
    return Promise.resolve(undefined);
  }
}

function createDomainLayer(object) {
  console.log('***********Executing Domain Layer***********');
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
    return new Promise(resolve => {
      console.log('Creating Domain Interface ...');
      createClassFiles(interfaceConfig,() => {
        console.log('Creating Domain Helper ...');
        createClassFiles(helperConfig,() =>  {
          console.log('Creating Domain Class ...');
          createClassFiles(domainConfig, () => resolve(`${object.apiName}.sobjectType =\> ${object.className}.Constructor.class`));
        });
      });
    });
  } else {
    console.log('Domain Layer proccess skipped');
    return Promise.resolve(undefined);
  }
}

function createServiceLayer(object) {
  console.log('***********Executing Service Layer***********');
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
    return new Promise(resolve => {
      console.log('Creating Service Interface ...');
      createClassFiles(interfaceConfig,() => {
        console.log('Creating Service Helper ...');
        createClassFiles(helperConfig,() =>  {
          console.log('Creating ServiceImpl ...');
          createClassFiles(serviceImplConfig, () => {
            console.log('Creating Service Class ...');
            createClassFiles(serviceConfig, () => resolve(`${object.interfaceName}Service.class =\> ${object.className}ServiceImpl.class`));
          });
        });
      });
    });
  } else {
    console.log('Service Layer proccess skipped');
    return Promise.resolve(undefined);
  }
}

function createResourceLayer(object) {
  console.log('***********Executing Resosource Layer***********');
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
    return new Promise(resolve => {
      console.log('Creating Resource Class ...');
      createClassFiles(resourceConfig, () => resolve());
    });
  } else {
    console.log('Resource Layer proccess skipped');
    return Promise.resolve(undefined);
  }
}

function createApplicationLayer(appLayer, objects) {
  console.log('***********Executing Application Layer***********');
  if(generateApplicationLayer) {
    let uowLayer = [];
    let generateDataLayer = false;
    let generateServiceLayer = false;
    let generateDomainLayer = false;
    objects.forEach(object => {
      uowLayer.push(`${object.apiName}.SObjectType`)
      if(!generateDataLayer) {
        generateDataLayer = object.createDataLayer;
      }
      if(!generateServiceLayer) {
        generateServiceLayer = object.createServiceLayer;
      }
      if(!generateDomainLayer) {
        generateDomainLayer = object.createDomainLayer;
      }
    });
    const applicationVariables = {
      defaultFieldset : defaultFieldSet,
      className : applicationClass,
      uowLayer : '\t\t' + uowLayer.join(",\n\t\t"),
      dataLayer : (generateDataLayer ? '{\n\t\t' + appLayer.dataLayer.join(",\n\t\t") + '\n\t}': '()'),
      serviceLayer : (generateServiceLayer ? '{\n\t\t' + appLayer.serviceLayer.join(",\n\t\t") + '\n\t}' : '()'),
      domainLayer : (generateDomainLayer ? '{\n\t\t' + appLayer.domainLayer.join(",\n\t\t") + '\n\t}' : '()')
    }
    const applicationConfig = getConfig(
      false,
      '',
      'Application.cls.njk',
      applicationVariables,
      {className : applicationClass},
      output
    );
    console.log('Creating Application class ...');
    createClassFiles(applicationConfig);
  } else {
    console.log('Application Layer proccess skipped');
  }
}

function createClassFiles(templatingConfig, cb){
  //crear el fichero de la clase
  doTemplating(templatingConfig, () => 
    doTemplating({
      className: templatingConfig.className,
      extension: '.cls-meta.xml',
      outputFolder : templatingConfig.outputFolder,
      templateName : 'ClassMeta.xml.njk',
      variables:{
        apiVersion:apiVersion,
        className:templatingConfig.className
      },
      oldFileName : 'ClassMeta.xml'
  }, cb));
}

function doTemplating(templatingConfig, cb){
  metalsmith(path.join(__dirname, '../'))
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
        const oldLocation = path.join(__dirname, '../') + '/' + templatingConfig.outputFolder + '/' + templatingConfig.oldFileName;
        const newLocation = process.cwd() + '/' + templatingConfig.outputFolder + '/' + templatingConfig.oldFileName;
        moveFile.sync(oldLocation, newLocation);
        const newFile = process.cwd() + '/' + templatingConfig.outputFolder + '/' + templatingConfig.className + templatingConfig.extension;
        const oldFile = process.cwd() + '/' + templatingConfig.outputFolder + '/' + templatingConfig.oldFileName;
        fs.renameSync(oldFile, newFile);
        if(cb) {
          cb();
        }
      }
    });
}

function getFieldsToInclude(objectApiName, fieldsToInclude) {
  let fieldsString = "";
  if(fieldsToInclude) {
    const fields = fieldsToInclude.split(',');
    for(let i = 0; i < fields.length; i++) {
      if(i === 0) {
        fieldsString += `${objectApiName}.${fields[i]}`;
      } else {
        fieldsString += `,\n\t\t\t${objectApiName}.${fields[i]}`;
      }
    }
  } else {
    fieldsString += `${objectApiName}.Id,\n`;
    fieldsString += `\t\t\t${objectApiName}.Name`;
  }
  return fieldsString;
}

function getConfig(isInterface, sufix, template, variables, object, outputFolder) {
  let templatingConfig = {}
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