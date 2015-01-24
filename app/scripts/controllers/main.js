'use strict';

/**
 * @ngdoc function
 * @name owlReasonerApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the owlReasonerApp
 */
app.controller('MainCtrl',

    function ($scope, $http, $q, OntologyParser, WorkerService) {

        $scope.frontReasoner = {
            'workerlog':  [],
            'owlFileName': 'Keywords_WWW2012_V3_min.owl',
            'isLoading': false,
            'status': 'Ready',
            'query': 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> select ?o { <#Spatial-temporal_systems> <rdf:type> ?o }'
        };

        var postLog = function(msg, isError, toggleLoads) {
                $scope.frontReasoner.workerlog.push({
                    'time': new Date().getTime(),
                    'msg':  msg,
                    'isError': isError
                });

                if(toggleLoads) toggleLoading();
            },

            toggleLoading = function() {
                $scope.frontReasoner.isLoading = !$scope.frontReasoner.isLoading;
            },

            processMessage = function(message) {
                if(message.msg) postLog(message.msg, message.isError, message.toggleLoads);
                if(message.sparqlResults) $scope.frontReasoner.sparqlResults = message.sparqlResults;
                //else if(message.save)
            };


        $scope.getOwl = function() {
            if(this.frontReasoner.owlFileName.match(/.*\.owl$/i)) {
                this.frontReasoner.owlFileLocation = 'http://localhost:3000/ontologies/' + this.frontReasoner.owlFileName;
            }
        };

        $scope.startWorker = function() {

            if(this.frontReasoner.owlFileLocation && !this.frontReasoner.isLoading) {

                postLog("OWL ontology parsing & aBox generation started ...", false, true);

                var promises = [
                    OntologyParser.classify({
                        filename: this.frontReasoner.owlFileName,
                        time: new Date().getTime()
                    }).$promise
                ];

                $q.all(promises).then(
                    function (responses) {
                        var data = responses[0],
                            responseDelay = new Date().getTime() - data.time;
                        data.command = 'start';

                        postLog("OWL ontology parsed: " + data.ontology.axioms.length + " axioms", false, true);
                        postLog("Reasoner initialized: " + data.reasoner.aBox.database.ClassAssertion.length + " class assertions, " + data.reasoner.aBox.database.ObjectPropertyAssertion.length + " object property assertions.");
                        postLog("Configuring worker for reasoning ... ", false, true);

                        WorkerService
                            .process(JSON.stringify(data))
                            .then(function(message) {
                                processMessage(message);

                                postLog('Requesting time : ' + data.requestDelay, false, false);
                                postLog('Classifying time : ' + data.processingDelay, false, false);
                                postLog('Response delay : ' + responseDelay, false, false);
                            });
                    },
                    function (err) {
                        postLog("OWL Parsing failed. " + err.data, true, true);
                    }
                );


            } else {
                postLog('Busy', true);
            }
        };

        $scope.executeQuery = function() {

            postLog("Evaluating query ... ", false, true);
            var before = new Date().getTime();

            /*
             Decommenter ceci puis commenter les lignes suivantes de la fonction pour
             les tests sur x requetes
             var promises = [];

             for(var i = 0; i < 1000; i++) {
             promises.push(WorkerService.process(
             JSON.stringify({
             before: before,
             reasoner: Reasoner,
             command: 'process',
             sparqlQuery: $scope.frontReasoner.query
             })
             )
             );
             }

             $q.all(promises).then(
             function (message) {

             }
             );*/

            WorkerService
                .process(
                    JSON.stringify({
                        command: 'process',
                        sparqlQuery: this.frontReasoner.query
                    })
                )
                .then(function(message) {
                    processMessage(message);
                    postLog("Querying : " + (new Date().getTime() - before).toString(), false, false);
                });
        };

        $scope.getOwl();

  });
