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
  generateScafold(config);
}

function generateScafold(config) {
  console.log(output);
  const applicationConfig = {dataLayer:[]};
  apiVersion = config.apiVersion;
  applicationClass = config.applicationClass;
  defaultFieldSet = config.defaultFieldset;

  async.eachSeries(config.objects, (object, next) => {
    generateDataLayer(object).then(resolve =>{
      return generateDomainLayer(object)
    })
    .then(resolve => {
      return generateServiceLayer(object);
    })
    .then(resolve => {
      return generateResourceLayer(object);
    })
    .then(() => {
      next();
    })
  }, () => {
    console.log(applicationConfig);
  });
}

function generateDataLayer(object) {
  console.log('***********Executing Data Layer***********')
  return new Promise(resolve => {
    if(object.createDataLayer) {
      const interfaceName = object.interfaceName + 'Selector';
      //Selector interface configuration
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
      //Selector class configuration
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
      //Create Selector interface and Selector class
      console.log('Creating Selector Interface ...')
      executeTemplating(interfaceConfig).then(() => {
        console.log('Creating Selector Class ...')
        return executeTemplating(selectorConfig);
      }).then(() => 
        resolve(`${object.apiName}.sobjectType => ${object.className}Selector.class`)
      );
    } else {
      console.log('Data Layer proccess skipped');
      resolve()
    }
  })
}

function generateDomainLayer(object) {
  console.log('***********Executing Domain Layer***********')
  return new Promise(resolve => {
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
      //Create Domain interface and Domain class
      console.log('Creating Domain Interface ...')
      executeTemplating(interfaceConfig).then(() => {
        console.log('Creating Domain Helper Class ...')
        return executeTemplating(helperConfig);
      }).then(() => {
        console.log('Creating Domain Class ...')
        return executeTemplating(domainConfig);
      }).then(() => {
        resolve();
      })
    } else {
      console.log('Domain Layer proccess skipped');
      resolve();
    }
  });
}

function generateServiceLayer(object) {
  console.log('***********Executing Service Layer***********')
  return new Promise(resolve => {
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
      //Create Domain interface and Domain class
      console.log('Creating Service Interface ...')
      executeTemplating(interfaceConfig).then(() => {
        console.log('Creating Service Helper Class ...')
        return executeTemplating(helperConfig);
      }).then(() => {
        console.log('Creating ServiceImpl Class ...')
        return executeTemplating(serviceImplConfig);
      }).then(() => {
        console.log('Creating Service Class ...')
        return executeTemplating(serviceConfig);
      }).then(() => {
        resolve();
      })
    } else {
      console.log('Service Layer proccess skipped');
      resolve();
    }
  });
}

function generateResourceLayer(object) {
  console.log('***********Executing Resource Layer***********')
  return new Promise(resolve => {
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
      console.log('Creating Resources class ...')
      executeTemplating(resourceConfig).then(() => {
        resolve();
      })
    } else {
      console.log('Resource Layer proccess skipped');
      resolve();
    }
  });
}

function executeTemplating(templatingConfig) {
  return new Promise((resolve) => {
    let promise = new Promise((resolve , reject) => {
      metalsmith('.')
        .metadata(templatingConfig.variables)
        .source('templates')
        .destination(templatingConfig.outputFolder)
        .clean(false)
        .use(filter(templatingConfig.templateName))
        .use(inplace())
        .build(function(err) {
          if (err) {
            reject();
            throw err;
          } else {
            resolve();
          }
        });
    });
    promise.then(() => {
      const newFile = templatingConfig.outputFolder + '/' + templatingConfig.className + '.cls';
      const oldFile = templatingConfig.outputFolder + '/' + templatingConfig.oldFileName;
      fs.renameSync(oldFile, newFile);
      createClassMeta(templatingConfig).then(() => {
        resolve();
      })
    })
  })
}

function createClassMeta(templatingConfig) {
  let promise = new Promise((resolve, reject) => {
    metalsmith('.')
    .metadata({
      apiVersion:apiVersion,
      className:templatingConfig.className
    })
    .source('templates')
    .destination(templatingConfig.outputFolder)
    .clean(false)
    .use(filter('ClassMeta.xml.njk'))
    .use(inplace())
    .build(function(err) {
      if (err) {
        reject();
        throw err;
      } else {
        resolve();
      }
    });
  });
  return new Promise((resolve => {
    promise.then(() => {
      const newFile = templatingConfig.outputFolder + '/' + templatingConfig.className + '.cls-meta.xml';
      const oldFile = templatingConfig.outputFolder + '/ClassMeta.xml';
      fs.renameSync(oldFile, newFile);
      resolve();
    });
  }))
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