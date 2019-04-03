function fetchRequests() {

    var records = JSON.parse(localStorage.getItem('records'));
    var recordList = document.getElementById('record');

    recordList.innerHTML = '';

    if (records === null) {
        return;
    }
    
    for (var i = 0; i < records.length; i++) {
        var id = records[i]._id;
        var type = records[i]._type;
        var addr = records[i]._address;
        var details = records[i]._details;
        var status = records[i]._status;
        var appId = records[i]._appId;

        var additional;

        if (type == 'Register') {
            if (status == 'Pending') {
                additional = '<a href="#" class="btn btn-warning" onclick="confirmRegistration(\''+id+'\')">Complete</a>  ';
            }
            else if (status == 'Confirmed') {
                additional = '<a href="#" class="btn btn-warning" onclick="updateDevice(\''+id+'\')">View</a>  ';
            }
            else {
                additional = '';
            }
        }
        else if (type == 'Sign') {
            if (status == 'Pending') {
                additional = '<a href="#" class="btn btn-warning" onclick="confirmAuthentication(\''+id+'\')">Complete</a>  ';
            }
            else if (status == 'Confirmed') {
                additional = '<a href="#" class="btn btn-warning" onclick="updateLastVerified(\''+id+'\')">View</a>  ';
            }
            else {
                additional = '';
            }
        }

        recordList.innerHTML += '<div class="well">' +
                                '<h3>Record ID: ' + id + '</h3>' +
                                '<p><span class="label label-default">' + type + '</span>' + ' ' +
                                '<span class="label label-info">' + status + '</span></p>' +
                                '<p><span class="glyphicon glyphicon-user"></span> ' + addr + '</p>'+
                                '<p><span class="glyphicon glyphicon-tag"></span> ' + appId + '</p>'+
                                '<h6>Details: ' + details + '</h6>' +
                                additional + 
                                '<a href="#" class="btn btn-danger" onclick="deleteRecord(\''+id+'\')">Delete</a>' +
                                '</div>';

    }

}



function deleteRecord(id) {

    var records = JSON.parse(localStorage.getItem('records'));

    for (var i = 0; i < records.length; i++) {
        if (records[i]._id == id) {
            records.splice(i, 1);
            break;
        }
    }

    localStorage.setItem('records', JSON.stringify(records));

    fetchRequests();

}


function clearAll() {

    if (JSON.parse(localStorage.getItem('records')) === null) {
        return;
    }

    localStorage.setItem('records', JSON.stringify([]));


    fetchRequests();

}

