/**
 * Created by Spadon on 01/12/2014.
 */

app.factory('WorkerService', ['$q', function($q) {
    var ReasonerWorker = new Worker('workers/ReasonerWorker.js'),
        defer = $q.defer()/*,
        before*/;

    ReasonerWorker.addEventListener('message', function(message) {
        //console.log("Querying : " + (new Date().getTime() - before).toString());
        defer.resolve(message.data)
    }, false);

    return {
        process: function(data) {
            //before = JSON.parse(data).before;
            defer = $q.defer();
            ReasonerWorker.postMessage(data);
            return defer.promise;
        }
    };
}]);

app.factory('LogWorkerService', function() {

});