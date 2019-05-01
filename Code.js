function buildAddOn(e) {
    var accessToken = e.messageMetadata.accessToken;
    GmailApp.setCurrentMessageAccessToken(accessToken);
  
    var userProperties = PropertiesService.getUserProperties();  
    var messageId = e.messageMetadata.messageId;
    var message = GmailApp.getMessageById(messageId);
    var subject = message.getSubject();
  
    // Creates required labels and fields if they don't exist
    if (!(GmailApp.getUserLabelByName('Clio Manual'))){
      GmailApp.createLabel('Clio Manual');
    };
    
    if (!(GmailApp.getUserLabelByName('Clio Auto'))){
      GmailApp.createLabel('Clio Auto');
    };
    if (!(userProperties.getProperty('field_name'))){
      userProperties.setProperty('field_name', 'Odyssey')
    };
    
    // Processing email for file upload
    var cache = CacheService.getUserCache();
    cache.put('CaseNumber', isClioMessage(message, subject));
    Logger.log(cache.get('CaseNumber'));
    if (cache.get('CaseNumber') != 'none') {
      cache.put('Link', getLink(message.getBody()));
      var fieldName = userProperties.getProperty('field_name');
      cache.put('CaseFieldID', getCaseFieldID(fieldName));
      cache.put('Matter', JSON.stringify(getMatter(cache.get('CaseFieldID'),cache.get('CaseNumber'))));
    }
    var card = buildRootCard()
  
    return card;
  }