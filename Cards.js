function buildPreferencesCard(){
    var section = CardService.newCardSection()
    .setHeader('Test');
    var button = CardService.newTextButton()
    .setText("Open Me")
    .setOpenLink(CardService.newOpenLink()
                 .setUrl("https://www.google.com")
                 .setOpenAs(CardService.OpenAs.OVERLAY)
                 .setOnClose(CardService.OnClose.RELOAD_ADD_ON));
    section.addWidget(button)
    var card = CardService.newCardBuilder().addSection(section).build()
  
    return CardService.newUniversalActionResponseBuilder()
    .displayAddOnCards([card]).build();
  }
  
  function buildRootCard(){
  
    var cache = CacheService.getUserCache();
    var sectionInfo = CardService.newCardSection()
      .setHeader("<font color=\"#1257e0\"><b>Message Information</b></font>");  
    
    if (cache.get('CaseNumber') == 'none') {
      var textInfo = CardService.newTextParagraph()
      .setText("This is not a valid message.");
      sectionInfo.addWidget(textInfo)
    } else {
      var caseKeyValue = CardService.newKeyValue()
      .setContent(cache.get('CaseNumber'))
      .setTopLabel('Case Number');
      var linkKeyValue = CardService.newKeyValue()
      .setContent(cache.get('Link'))
      .setTopLabel('Link')
      .setMultiline(true);    
      sectionInfo.addWidget(caseKeyValue);
      sectionInfo.addWidget(linkKeyValue);
  
      var sectionMatter = CardService.newCardSection()
      .setHeader('<font color=\"#1257e0\"><b>Associated Matter</b></font>');
      
      var objMatter = JSON.parse(cache.get('Matter'));
  
      if (objMatter.id == 'none') {  
        var textMatter = CardService.newTextParagraph()
        .setText("No matter is associated with this case number.");
   
        var matterSuggest = CardService.newAction()
        .setFunctionName('matterSuggest');
        var matterText = CardService.newTextInput()
        .setFieldName('matter_field')
        .setTitle('Matter')
        .setHint('Search matters as in Clio')
        .setSuggestionsAction(matterSuggest);      
        
        var buildMatterCard = CardService.newAction().setFunctionName('attachMatter')
        var matterButton = CardService.newTextButton()
        .setText('Attach Matter')
        .setOnClickAction(buildMatterCard);
        sectionMatter.addWidget(textMatter);
        sectionMatter.addWidget(matterText);
        sectionMatter.addWidget(matterButton);
      } else {
        var matterKeyValue = CardService.newKeyValue()
        .setContent(objMatter.display_number + ": " + objMatter.description)
        .setTopLabel('Matter')
        .setMultiline(true);
        var clientKeyValue = CardService.newKeyValue()
        .setContent(objMatter.client.name)
        .setTopLabel('Client')
        .setMultiline(true);
        var status = isDocumentAttached(objMatter.id,cache.get('Link'));
        var documentKeyValue = CardService.newKeyValue()
        .setContent(status)
        .setTopLabel('Document Status');
        sectionMatter.addWidget(matterKeyValue);
        sectionMatter.addWidget(clientKeyValue);
        sectionMatter.addWidget(documentKeyValue);
        if (status == 'Missing'){
          var attachDocument = CardService.newAction()
          .setFunctionName('attachDocument');
          var attachButton = CardService.newTextButton()
          .setText('Attach')
          .setOnClickAction(attachDocument);
          sectionMatter.addWidget(attachButton);        
        };
      };
    };
  
    // Build the main card after adding the sections.
  
    if (cache.get('CaseNumber') == 'none'){
    var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
      .setTitle('Upload Documents to Clio')
      .setImageUrl('https://iliadconnect.com/static/iliad.png'))
      .addSection(sectionInfo)
      .build();   
    } else {
    var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
      .setTitle('Upload Documents to Clio')
      .setImageUrl('https://iliadconnect.com/static/iliad.png'))
      .addSection(sectionInfo)
      .addSection(sectionMatter)
      .build();    
    };
  
    return card
    
  }
  
  function attachDocument(){
    var cache = CacheService.getUserCache();
    var link = cache.get('Link');
    var files = collectFiles(link);
    var matterID = JSON.parse(cache.get('Matter')).id;
    
    if (files == 'stale'){
      return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
                       .setText("The link has expired or is invalid."))
      .build();
  
    } else {
      for (i = 0; i < files.length; i++){
        uploadFile(matterID, link, files[i]);
      }
    }
    
    return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildRootCard()))
    .build()
  }
  
  function attachMatter(e){
    var cache = CacheService.getUserCache();
    var userProperties = PropertiesService.getUserProperties();
    if (e['formInput'].matter_field != ''){
      var res = e['formInput'].matter_field;
      // Need error handling
      var matters = getMatters(res.slice(0,res.indexOf(': ')-1));
      if (matters.length != 0){
        var field = matters[0].custom_field_values.filter(function(custom_field){return custom_field.field_name == userProperties.getProperty('field_name')})[0];
        if (typeof field !== 'undefined') {
          assignMatter(matters[0].id, cache.get('CaseFieldID'), field.id);
        } else {
          assignMatter(matters[0].id, cache.get('CaseFieldID'), 'missing');
        }
        cache.put('Matter', JSON.stringify(matters[0]));
      }
      var nav = CardService.newNavigation().updateCard(buildRootCard());
      return CardService.newActionResponseBuilder()
      .setNavigation(nav)
      .setStateChanged(true)
      .build();
    }  
  }
  
  function matterSuggest(e){
    var matters = getMatters(e['formInput'].matter_field);
    var suggestions = [];
    if (matters.length < 5){
      matters.forEach(
        function(matter){
          suggestions.push(matter.display_number + ': \n' + matter.description)
        }
      );
    } else {
      for (i = 0; i < 5; i++){
        var matter = matters[i];
        suggestions.push(matter.display_number + ': \n' + matter.description)
      }
    }
    
    return CardService.newSuggestionsResponseBuilder()
    .setSuggestions(CardService.newSuggestions().addSuggestions(suggestions))
    .build()
  
  }
  