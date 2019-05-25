function updateRequest() {

    var record = JSON.parse(localStorage.getItem('record'));
    var recordList = document.getElementById('record');

    recordList.innerHTML = '';

    if (record === null) {
        return;
    }
    
    var type = 'Sign';
    var server = localStorage.getItem('server');

    var address = record._address;
    var request = record._request;
    var response = record._response;
    var verification = record._verification;
    var status = record._status;
    var appId = record._appId;

    recordList.innerHTML += '<div class="well">' +
                            '<h3>Server Address: ' + server + '</h3>' +
                            '<p><span class="label label-default">' + type + '</span>' + ' ' +
                            '<span class="label label-info">' + status + '</span></p>' +
                            '<p><span class="glyphicon glyphicon-user"></span> ' + address + '</p>'+
                            '<p><span class="glyphicon glyphicon-tag"></span> ' + appId + '</p>'+
                            '<h6>Request: ' + request + '</h6>' +
                            '<h6>Response: ' + response + '</h6>' +
                            '<h6>Verification: ' + verification + '</h6>' +
                            '</div>';


}



function clearRecord() {

    if (JSON.parse(localStorage.getItem('record')) === null) {
        return;
    }

    localStorage.setItem('record', null);


    updateRequest();

}

