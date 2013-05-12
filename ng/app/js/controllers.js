'use strict';

/* Controllers */
function DownloadCtrl($scope, $http, $timeout) {
    $scope.downloads = [];
    
    $scope.isActive = function(download) {
        return download.status === 'active';
    };
    
    function updateStatus() {
        sendCommand($scope, $http, 'aria2.getGlobalStat', null, false).success(function(data, status) {
            $scope.stats = data.result;
        });

        sendCommand($scope, $http, 'system.multicall', [
            {methodName: 'aria2.tellActive'},
            {methodName: 'aria2.tellWaiting', params: [0, 10]},
            {methodName: 'aria2.tellStopped', params: [0, 10]}
        ], false).success(function(data, status) {
            $scope.downloads.length = 0;
            for (var i = 0; i < data.result.length; ++i) {
                $scope.downloads = $scope.downloads.concat(data.result[i][0]);
            }
        });

        $timeout(updateStatus, 1000);
    }
    updateStatus();

    sendCommand($scope, $http, 'aria2.getVersion', null, false).success(function(data, status) {
        $scope.version = data.result;
    });

    $scope.tabs = [{"title": "HTTP"}, {"title": "BitTorrent"}, {"title": "Metalink"}];
    $http({
        method: 'GET',
        url: 'partials/httpTab.html',
        cache: true
    }).success(function(data, status) {
        $scope.tabs[0].content = data;
    });
    $http({
        method: 'GET',
        url: 'partials/torrentTab.html',
        cache: true
    }).success(function(data, status) {
        $scope.tabs[1].content = data;
    });
    $http({
        method: 'GET',
        url: 'partials/metalinkTab.html',
        cache: true
    }).success(function(data, status) {
        $scope.tabs[2].content = data;
    });
    $scope.tabs.activeTab = 0;

    $scope.reset = function() {
        $scope.uri = {
            http: {
                uri: ''
            },
            torrent: {},
            metalink: {}
        };
        $('.uri-form .ng-dirty').removeClass('ng-dirty').addClass('ng-pristine');
    };

    $scope.addHttp = function() {
        sendCommand($scope, $http, 'aria2.addUri', [$scope.uri.http.uri])
                .success(function(data, status) {
            $scope.$emit('ALERT', {
                "type": "success",
                "title": "Success",
                "content": "URI: <code>" + $scope.uri.http.uri + "</code> added."
            });
            $scope.reset();
        });
    };

    $scope.reset();
}
DownloadCtrl.$inject = ['$scope', '$http', '$timeout'];

function SettingsCtrl($scope, $http) {
    function init() {
        sendCommand($scope, $http, 'aria2.getGlobalOption').success(function(data, status) {
            $scope.master = [];
            angular.forEach(data.result, function(value, key) {
                $scope.master.push({
                    key: key,
                    value: value
                });
            });
            $scope.settings = angular.copy($scope.master);
        });
    }
    init();

    $scope.filter = {
        query: '',
        modified: false
    };

    $scope.update = function() {
        var changeset = {};
        for (var i = 0; i < $scope.settings.length; ++i) {
            if (!angular.equals($scope.settings[i], $scope.master[i])) {
                changeset[$scope.settings[i].key] = $scope.settings[i].value;
            }
        }
        sendCommand($scope, $http, 'aria2.changeGlobalOption', changeset).success(function(data,
                status) {
            $scope.reset();
            init();
            $scope.$emit('ALERT', {
                "type": "success",
                "title": "Success",
                "content": "Settings saved."
            });
        });
        $("html, body").scrollTop(0);
    };

    $scope.reset = function() {
        $scope.settings.length = 0;
        $scope.settings = angular.copy($scope.master);
        $scope.filter = {
            query: '',
            modified: false
        };
        $("html, body").scrollTop(0);
        $scope.$emit('ALERT', {
            "type": "info",
            "title": "Info",
            "content": "The form has been reset."
        });
    };

    $scope.markDirty = function(setting) {
        setting.dirty = true;
    };
}
SettingsCtrl.$inject = ['$scope', '$http'];