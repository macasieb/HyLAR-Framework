'use strict';

/**
 * @ngdoc function
 * @name owlReasonerApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the owlReasonerApp
 */
app.controller('MainCtrl',

    function ($scope, $http, $q,
              Hylar, ServerTime, LoggingService,
              FileUploader, AdaptationService) {

        $scope.adaptationParameters = AdaptationService.parameters;
        $scope.setAdaptationParameters = function() {
            AdaptationService.parameters = this.adaptationParameters;
            console.log(AdaptationService.parameters);
        };

        $scope.updateList = function() {
            $scope.ontologyList = Hylar.remote.list;
        };

        $scope.clearLog = function() {
            LoggingService.log = [];
        };

        $scope.uploader = new FileUploader();
        $scope.uploader.url = angular.injector(['config']).get('ENV').serverRootPath +  '/ontology';
        $scope.uploader.autoUpload = true;
        $scope.uploader.onSuccessItem = function() {
            LoggingService.msg('Your file has been sucessfully uploaded. You can choose it on the list !').submit();
            $scope.updateList();
        };

        $scope.config = Hylar.config;
        $scope.owlFileName = 'fipa.owl';
        $scope.workerlog = LoggingService.log;

        var processMessage = function(data) {
            if (data && data.msg) {
                if(data.isError) {
                    LoggingService.err(data.msg)
                } else LoggingService.msg(data.msg);
                LoggingService.submit();
            } else if (data && data.sparqlResults) {
                $scope.sparqlResults = data.sparqlResults;
            }
        };

        $scope.removeReasoner = function() {
            localStorage.removeItem('reasoner');
            $scope.config.reasoner = localStorage.getItem('reasoner');
        };

        $scope.startWorker = function() {
            var that = this,
                classif = Hylar.config.classification;
            AdaptationService.answerClassificationLocationQuestion(that.owlFileName).then(function(res) {
                if (classif == 'auto') {
                    classif = res;
                    LoggingService.msg('Classification on the ' + res + ' side.').submit()
                }

                if (that.owlFileName) {
                    var promise,
                        filename = that.owlFileName;
                    LoggingService.msg('Initializing...').submit();

                    ServerTime.getServerTime().$promise.then(function (time) {

                        if (classif == 'server') {
                            promise = Hylar.remote.classify({
                                filename: filename,
                                time: time.milliseconds,
                                reasoningMethod: $scope.config.reasoningMethod
                            }).$promise;
                        } else {
                            promise = Hylar.remote.fetch({
                                filename: filename,
                                time: time.milliseconds,
                                reasoningMethod: $scope.config.reasoningMethod
                            }).$promise;
                        }

                        promise.then(
                            function (response) {
                                ServerTime.getServerTime().$promise.then(function (time) {
                                    var data = response.data,
                                        responseDelay = time.milliseconds - data.time,
                                        startTime = time.milliseconds;

                                    data.command = 'start';
                                    data.inWorker = Hylar.config.inWorker;
                                    data.reasoningMethod = $scope.config.reasoningMethod;

                                    Hylar.client.process(data).then(function (message) {
                                        ServerTime.getServerTime().$promise.then(function (time) {
                                            var classifyingTime = data.processingDelay || time.milliseconds - startTime;
                                            processMessage(message);
                                            LoggingService.msg('Requesting time : ' + data.requestDelay).submit();
                                            LoggingService.msg('Response delay : ' + responseDelay).submit();
                                            LoggingService.msg('Classifying time : ' + classifyingTime).submit();
                                            $scope.config.reasoner = localStorage.getItem('reasoner');
                                        });
                                    });
                                });


                            },
                            function (err) {
                                LoggingService.err('OWL Parsing failed. ' + err.data).submit();
                            }
                        );

                    });

                }
            });
        };

        $scope.executeQuery = function() {
            var that = this,
                querying = Hylar.config.querying;
            AdaptationService.answerQueryAnsweringLocationQuestion(that.owlFileName).then(function(res) {
                if (Hylar.config.querying == 'auto') {
                    querying = res;
                    LoggingService.msg('Querying on the ' + res + ' side.').submit()
                }

                if(querying == 'client' && !localStorage.getItem('reasoner')) {
                    LoggingService.err('Client-side reasoner not ready').submit();
                    return;
                }

                var promise;
                LoggingService.msg('Evaluating query ... ').submit();

                ServerTime.getServerTime().$promise.then(function(time) {
                    if(querying == 'client') {
                        promise = Hylar.client.process({
                            command: 'process',
                            reasoner: localStorage.getItem('reasoner'),
                            sparqlQuery: Hylar.config.query,
                            inWorker: Hylar.config.inWorker,
                            reasoningMethod: $scope.config.reasoningMethod
                        });
                    } else {
                        promise = Hylar.remote.query({
                            query: Hylar.config.query,
                            time: time.milliseconds,
                            inWorker: Hylar.config.inWorker,
                            reasoningMethod: $scope.config.reasoningMethod
                        }).$promise;
                    }

                    promise.then(function(response) {
                        ServerTime.getServerTime().$promise.then(function (time) {
                            if(response.isError) {
                                LoggingService.err(response.msg).submit();
                            } else {
                                var responseDelay = time.milliseconds - response.time;
                                $scope.sparqlResults = response.data;
                                LoggingService.msg($scope.sparqlResults.length + ' results.').submit();
                                response.requestDelay && LoggingService.msg('Requesting time : ' + response.requestDelay).submit();
                                responseDelay && LoggingService.msg('Response delay : ' + responseDelay).submit();
                                LoggingService.msg('Querying processing time : ' + response.processingDelay).submit();
                            }
                        });
                    });
                });
            });

        };

        $scope.updateList();

  });