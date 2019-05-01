function assignMatter(matterID, field_id, custom_id){
    var cache = CacheService.getUserCache();
    
    if (custom_id == 'missing'){
      Logger.log("Made It")
      // Payload adds a new custom field with the appropriate case number
      var payload = {
        "data": {
          "custom_field_values": [{
            "custom_field" : {"id" : field_id},
            "value" : cache.get('CaseNumber')
          }]
        }
      }
      } else {
        // Payload updates an existing custom field with the appropriate case number
        var payload = {
          "data": {
            "custom_field_values": [{
              "id" : custom_id,
              "custom_field" : {"id" : field_id},
              "value" : cache.get('CaseNumber')
            }]
          }
        };
        Logger.log(payload);
      };
    
    var strMatter = accessProtectedResource('https://app.clio.com/api/v4/matters/' + matterID + '.json?fields=id,display_number,description,client','patch',{},JSON.stringify(payload),'application/json');
    return JSON.parse(strMatter);
  }
  
  function createCaseField() {
    var userProperties = PropertiesService.getUserProperties();
    var payload = {
          "data": {
            "name": userProperties.getProperty('field_name'),
            "parent_type": "Matter",
            "field_type": "text_line"
          }
        };  
    return accessProtectedResource('https://app.clio.com/api/v4/custom_fields.json','post',{},JSON.stringify(payload),'application/json');
  }
  
  function getCaseFieldID(fieldName){
    // Deleted fields persist for a time with deleted: true. Must test
    var strCaseNumber = accessProtectedResource('https://app.clio.com/api/v4/custom_fields.json?fields=id,field_type,deleted,etag&parent_type=Matter&query=' + fieldName);
    var objCaseNumber = JSON.parse(strCaseNumber).data.filter(function(field){return field.deleted==false})[0];
    if (objCaseNumber){
        return objCaseNumber.id
    } else {
      strCaseNumber = createCaseField();
      return JSON.parse(strCaseNumber).data.id;    
    }
  }
  
  function getContacts(query){
    var strContacts = accessProtectedResource('https://app.clio.com/api/v4/contacts.json?fields=id,name&order=name(asc)&query=' + query);
    return JSON.parse(strContacts).data
  }
  
  function getMatter(CaseFieldID,CaseNumber){
    var strMatter = accessProtectedResource('https://app.clio.com/api/v4/matters.json?fields=id,display_number,description,client&custom_field_values[' + CaseFieldID +']=' + CaseNumber);
    var objMatter = JSON.parse(strMatter);
    var numRecords = objMatter.meta.records
    if (numRecords==1){
      return objMatter.data[0];
    } else if (numRecords==0){
      return {'id':'none'}
    } else {
      return {'id':'duplicates'};
    };
  }
  
  function getMatters(query){
    return JSON.parse(accessProtectedResource(encodeURI('https://app.clio.com/api/v4/matters.json?fields=id,custom_field_values{id,field_name,value},description,display_number,client&query=' + query))).data;
    }
  
  function uploadFile(id,link,myFile){
  
    var disposition = myFile.getHeaders()['Content-Disposition'];
    var filename = disposition.slice(disposition.indexOf('filename=')+9);
    if (filename[0]=='"'){
      filename = filename.slice(1,-1)
    };
    
    // Gets bucket for file upload
    var payload = {
          "data": {
            "name": filename,
            "parent": {
              "id" : id,
              "type" : "Matter"
            },
            "external_properties":[{
              "name": "link",
              "value": link
            }]
          }
        };  
  
    var strFileShell = accessProtectedResource(encodeURI('https://app.clio.com/api/v4/documents.json?fields=id,latest_document_version{uuid,put_url,put_headers}'),'post',{},JSON.stringify(payload),'application/json');
    var objFileShell = JSON.parse(strFileShell).data;
  
    // Uploads file to AWS bucket
    var put_url = objFileShell.latest_document_version.put_url;
    var put_headers = {};
    
    objFileShell.latest_document_version.put_headers.forEach(
      function(el){
        put_headers[el['name']]=el['value'];
      }
    );
    
    var strFileUpload = UrlFetchApp.fetch(put_url,{'muteHttpExceptions': true,'method':'put','headers': put_headers,'payload':myFile});
  
    // Finalizes file upload and makes it available to Clio front end
    var payload = {
      "data": {
        "uuid": objFileShell.latest_document_version.uuid,
        "fully_uploaded" : true
      }
    };  
    accessProtectedResource('https://app.clio.com/api/v4/documents/' + objFileShell.id + encodeURI('.json?fields=id,latest_document_version{fully_uploaded}'),'patch',{},JSON.stringify(payload),'application/json');
  
  }
  
  function isDocumentAttached(id,link){
    var strDocuments = accessProtectedResource('https://app.clio.com/api/v4/documents.json?matter_id=' + id + '&external_property_name=link&external_property_value=' + link);
    var objDocuments = JSON.parse(strDocuments);
    if (objDocuments.data.length == 0) {
      return 'Missing'
    } else {
      return 'Uploaded'
    }
  }