# soc-config.json configuration

| Param | Type | Required | Description |
|---|:---:|---|---|
|`apiVersion`|String|YES|Api version for meta.xml files|
|`defaultFieldset`|String|YES|Default fieldset to be included in Data Layer classes|
|`generateApplicationLayer`|Boolean|YES|If true, Application Layer will be generated|
|`applicationClass`|String|YES|Name of the Application Layer class|
|`objects`|List|YES|Data of the objects on wich the layers will be generated|
|`objects.apiName`|String|YES|Api name of the object|
|`objects.className`|String|YES|Prefix of the classes that will be generated|
|`objects.interfaceName`|String|YES|Prefix of the interfaces that will be generated|
|`objects.createDomainLayer`|Boolean|YES|If true, Domain Layer will be generated|
|`objects.createDataLayer`|Boolean|YES|If true, Data Layer will be generated|
|`objects.createServiceLayer`|Boolean|YES|If true, Service Layer will be generated|
|`objects.createResourceLayer`|Boolean|YES|If true, Resource Layer will be generated|
|`objects.resourceUrlMapping`|String|YES|Url mapping os the Resource Layer class|
|`fieldsToInclude`|String|NO|API names of object fields to be included in the data layer separated by commas. By default, Id and Name fields will be included|

## Sample of valid soc-config.json

```JSON
{
  "apiVersion":"48.0",
  "defaultFieldset":"proj_default",
  "generateApplicationLayer":true,
  "applicationClass":"Proj_Application",
  "objects": [
    {
      "apiName":"proj_object__mdt",
      "className":"Proj_MTDObjects",
      "interfaceName":"Proj_IMTDObjects",
      "createDomainLayer":true,
      "createDataLayer":true,
      "createServiceLayer":true,
      "createResourceLayer":true,
      "resourceUrlMapping":"objects",
      "fieldsToInclude":"Id,Name,proj_micampo__c"
    },
    {
      "apiName":"proj_object2__c",
      "className":"Proj_Object2s",
      "interfaceName":"Proj_IObject2s",
      "createDomainLayer":true,
      "createDataLayer":true,
      "createServiceLayer":true,
      "createResourceLayer":true,
      "resourceUrlMapping":"object2s",
      "fieldsToInclude":"Id,Name,proj_micampo__c"
    }
  ]
}
```
