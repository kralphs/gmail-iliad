function updateSubjects(){
    var subjects = 
        ['Odyssey E-Notices -\\s*([A-Za-z0-9-]+)?','Notification of Service for Case:\\s*([A-Za-z0-9-]+)?',
         'Filing Accepted for Case:\\s*([A-Za-z0-9-]+)?','Notice of electronic filing for Case:\\s*([A-Za-z0-9-]+)?',
        'Filing Submitted for Case:\\s*([A-Za-z0-9-]+)?','Administrative Copy of Service for Case:\\s*([A-Za-z0-9-]+)?',
        '([A-Za-z0-9-]+)?\\s*- Notice of Issuance of Order, Opinion or Notice'];
     
    var script = PropertiesService.getScriptProperties();
    script.setProperty('subjects', JSON.stringify(subjects))
  }
  
  function isClioMessage(message, subject) {
    // Determines if the message is a valid Clio message
    var script = PropertiesService.getScriptProperties();
    var subjects = JSON.parse(script.getProperty('subjects'));
    
    for(var i = 0; i < subjects.length; i++) {
      var regex = new RegExp(subjects[i]);
      var tmp = regex.exec(subject);
      if (tmp) {
        var CaseNumber = tmp[1];
        var cmLabel = GmailApp.getUserLabelByName('Clio Manual');
        if (message.getThread().getLabels().indexOf(cmLabel) == -1){
          message.star();
          message.getThread().addLabel(cmLabel);
        };
        return CaseNumber;
      };
    };
    return 'none'
  };
  
  function getLink(content) {
    var links = content.match(/<a href=(["'])(?:(?=(\\?))\2.)*?\1/g);
      
    function filterItems(query) {
      return links.filter(function(el) {
        return el.toLowerCase().indexOf(query.toLowerCase()) > -1;
      })
    };
  
    links = filterItems('http');
    var domains = ['indiana.tylerhost.net','illinois.tylerhost.net','publicaccess.courts.in.gov'];
    
    for(var i = 0; i < domains.length; i++) {
      tmp = filterItems(domains[i]);
      if (tmp.length!=0) {
        var link = tmp[0].replace('<a href="','');
        return link.replace('"','');
      };
    };
  };
  
  function collectFiles(link){
    var resp = UrlFetchApp.fetch(link);
    var contentType = resp.getAllHeaders()['Content-Type'];
  
    if (contentType == 'application/pdf'){
      return [resp]
    } else {
      var content = resp.getContentText('utf-8');
      var links = content.match(/<a href=(["'])(?:(?=(\\?))\2.)*?\1/g);
      
      if (links == null){
        return 'stale'
      } else {
        var files = [];
        for (i = 0; i < links.length; i++){
          var base = link.substring(0,link.lastIndexOf('/'));
  
          link = links[i].replace('<a href="','').replace('"','');
          resp = UrlFetchApp.fetch(base + link);
          contentType = resp.getAllHeaders()['Content-Type'];
  
          if (contentType == 'application/pdf') {
            files.push(resp);
          } else {
            return 'stale'
          };
        };
        return files
      }
    }
  }
  
  function intersection(array1,array2){
    return array1.filter(function(value) {return -1 !== array2.indexOf(value)}) 
  }
  