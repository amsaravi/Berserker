'use strict';

/* Controllers */
function DownloadCtrl($scope, $http, $timeout) {
    $scope.downloads = [];

    $scope.hex2bin = function(n) {
        function checkHex(n) {
            return/^[0-9A-Fa-f]{1,64}$/.test(n);
        }
        if (!checkHex(n)) return 0;
        return parseInt(n, 16).toString(2)
    };

    $scope.isActive = function(download) {
        return download.status === 'active';
    };

    $scope.percentComplete = function(download) {
        if (download.pc) {
            return download.pc;
        }
        download.pc = (100 * download.files[0].completedLength / download.files[0].length).toFixed(1);
        return download.pc;
    }

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
                for (var j = 0; j < data.result[i][0].length; ++j)
                    $scope.downloads.push(data.result[i][0][j]);
            }
        });

        $scope.cronid = $timeout(updateStatus, 1000);
        return 'DownloadCtrl.updateStatus'; //cronid
    }
    updateStatus();
    $scope.$on('$destroy', function() {
        $timeout.cancel($scope.cronid);
    });

    sendCommand($scope, $http, 'aria2.getVersion', null, false).success(function(data, status) {
        $scope.version = data.result;
    });

    $scope.tabs = [
        {title: "HTTP", content: 'partials/httpTab.html'},
        {title: "BitTorrent", content: 'partials/torrentTab.html'},
        {title: "Metalink", content: 'partials/metalinkTab.html'}];
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