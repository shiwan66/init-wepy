'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _wepy = require('./../npm/wepy/lib/wepy.js');

var _wepy2 = _interopRequireDefault(_wepy);

var _com = require('./../components/com.js');

var _com2 = _interopRequireDefault(_com);

var _chartWrap = require('./canvas/chartWrap.js');

var _chartWrap2 = _interopRequireDefault(_chartWrap);

var _getConfig = require('./getConfig.js');

var _getConfig2 = _interopRequireDefault(_getConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Logs = function (_wepy$page) {
  _inherits(Logs, _wepy$page);

  function Logs() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, Logs);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = Logs.__proto__ || Object.getPrototypeOf(Logs)).call.apply(_ref, [this].concat(args))), _this), _this.components = {
      com: _com2.default
    }, _this.config = {}, _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(Logs, [{
    key: 'onShow',
    value: function onShow() {
      var pageThis = this;
      var deviceInfo = {
        SDKVersion: "1.3.0",
        brand: "devtools",
        errMsg: "getSystemInfo:ok",
        language: "zh_CN",
        model: "iPhone 6",
        pixelRatio: 2,
        platform: "devtools",
        screenHeight: 667,
        screenWidth: 375,
        system: "iOS 10.0.1",
        version: "6.5.6",
        windowHeight: 603,
        windowWidth: 375
      };
      console.log('设备信息', deviceInfo);
      var width = Math.floor(deviceInfo.windowWidth - deviceInfo.windowWidth / 750 * 10 * 2); //canvas宽度
      var height = Math.floor(width / 1.6); //这个项目canvas的width/height为1.6
      var canvasId = 'myCanvas';
      var canvasConfig = {
        width: width,
        height: height,
        id: canvasId
      };
      var config = (0, _getConfig2.default)(canvasConfig);
      _chartWrap2.default.bind(pageThis)(config);
    }
  }]);

  return Logs;
}(_wepy2.default.page);


Page(require('./../npm/wepy/lib/wepy.js').default.$createPage(Logs , 'pages/logs'));

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxvZ3MuanMiXSwibmFtZXMiOlsiTG9ncyIsImNvbXBvbmVudHMiLCJjb20iLCJjb25maWciLCJwYWdlVGhpcyIsImRldmljZUluZm8iLCJTREtWZXJzaW9uIiwiYnJhbmQiLCJlcnJNc2ciLCJsYW5ndWFnZSIsIm1vZGVsIiwicGl4ZWxSYXRpbyIsInBsYXRmb3JtIiwic2NyZWVuSGVpZ2h0Iiwic2NyZWVuV2lkdGgiLCJzeXN0ZW0iLCJ2ZXJzaW9uIiwid2luZG93SGVpZ2h0Iiwid2luZG93V2lkdGgiLCJjb25zb2xlIiwibG9nIiwid2lkdGgiLCJNYXRoIiwiZmxvb3IiLCJoZWlnaHQiLCJjYW52YXNJZCIsImNhbnZhc0NvbmZpZyIsImlkIiwiYmluZCIsInBhZ2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7Ozs7Ozs7SUFDcUJBLEk7Ozs7Ozs7Ozs7Ozs7O2tMQUNuQkMsVSxHQUFhO0FBQ1hDO0FBRFcsSyxRQUdiQyxNLEdBQVMsRTs7Ozs7NkJBQ0E7QUFDUCxVQUFJQyxXQUFXLElBQWY7QUFDQSxVQUFJQyxhQUFhO0FBQ2ZDLG9CQUFZLE9BREc7QUFFZkMsZUFBTyxVQUZRO0FBR2ZDLGdCQUFRLGtCQUhPO0FBSWZDLGtCQUFVLE9BSks7QUFLZkMsZUFBTyxVQUxRO0FBTWZDLG9CQUFZLENBTkc7QUFPZkMsa0JBQVUsVUFQSztBQVFmQyxzQkFBYyxHQVJDO0FBU2ZDLHFCQUFhLEdBVEU7QUFVZkMsZ0JBQVEsWUFWTztBQVdmQyxpQkFBUyxPQVhNO0FBWWZDLHNCQUFjLEdBWkM7QUFhZkMscUJBQWE7QUFiRSxPQUFqQjtBQWVBQyxjQUFRQyxHQUFSLENBQVksTUFBWixFQUFvQmYsVUFBcEI7QUFDQSxVQUFJZ0IsUUFBUUMsS0FBS0MsS0FBTCxDQUFXbEIsV0FBV2EsV0FBWCxHQUEwQmIsV0FBV2EsV0FBWCxHQUF5QixHQUExQixHQUFpQyxFQUFqQyxHQUFzQyxDQUExRSxDQUFaLENBbEJPLENBa0JpRjtBQUN4RixVQUFJTSxTQUFTRixLQUFLQyxLQUFMLENBQVdGLFFBQVEsR0FBbkIsQ0FBYixDQW5CTyxDQW1CNkI7QUFDcEMsVUFBSUksV0FBVyxVQUFmO0FBQ0EsVUFBSUMsZUFBZTtBQUNqQkwsZUFBT0EsS0FEVTtBQUVqQkcsZ0JBQVFBLE1BRlM7QUFHakJHLFlBQUlGO0FBSGEsT0FBbkI7QUFLQSxVQUFJdEIsU0FBTyx5QkFBVXVCLFlBQVYsQ0FBWDtBQUNBLDBCQUFVRSxJQUFWLENBQWV4QixRQUFmLEVBQXlCRCxNQUF6QjtBQUNEOzs7O0VBakMrQixlQUFLMEIsSTs7a0JBQWxCN0IsSSIsImZpbGUiOiJsb2dzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXHJcbmltcG9ydCB3ZXB5IGZyb20gJ3dlcHknXHJcbmltcG9ydCBDb20gZnJvbSAnLi4vY29tcG9uZW50cy9jb20nXHJcbmltcG9ydCBjaGFydFdyYXAgZnJvbSAnLi9jYW52YXMvY2hhcnRXcmFwJ1xyXG5pbXBvcnQgZ2V0Q29uZmlnIGZyb20gJy4vZ2V0Q29uZmlnJ1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMb2dzIGV4dGVuZHMgd2VweS5wYWdlIHtcclxuICBjb21wb25lbnRzID0ge1xyXG4gICAgY29tOiBDb21cclxuICB9XHJcbiAgY29uZmlnID0ge31cclxuICBvblNob3coKSB7XHJcbiAgICB2YXIgcGFnZVRoaXMgPSB0aGlzXHJcbiAgICB2YXIgZGV2aWNlSW5mbyA9IHtcclxuICAgICAgU0RLVmVyc2lvbjogXCIxLjMuMFwiLFxyXG4gICAgICBicmFuZDogXCJkZXZ0b29sc1wiLFxyXG4gICAgICBlcnJNc2c6IFwiZ2V0U3lzdGVtSW5mbzpva1wiLFxyXG4gICAgICBsYW5ndWFnZTogXCJ6aF9DTlwiLFxyXG4gICAgICBtb2RlbDogXCJpUGhvbmUgNlwiLFxyXG4gICAgICBwaXhlbFJhdGlvOiAyLFxyXG4gICAgICBwbGF0Zm9ybTogXCJkZXZ0b29sc1wiLFxyXG4gICAgICBzY3JlZW5IZWlnaHQ6IDY2NyxcclxuICAgICAgc2NyZWVuV2lkdGg6IDM3NSxcclxuICAgICAgc3lzdGVtOiBcImlPUyAxMC4wLjFcIixcclxuICAgICAgdmVyc2lvbjogXCI2LjUuNlwiLFxyXG4gICAgICB3aW5kb3dIZWlnaHQ6IDYwMyxcclxuICAgICAgd2luZG93V2lkdGg6IDM3NVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ+iuvuWkh+S/oeaBrycsIGRldmljZUluZm8pXHJcbiAgICBsZXQgd2lkdGggPSBNYXRoLmZsb29yKGRldmljZUluZm8ud2luZG93V2lkdGggLSAoZGV2aWNlSW5mby53aW5kb3dXaWR0aCAvIDc1MCkgKiAxMCAqIDIpLy9jYW52YXPlrr3luqZcclxuICAgIGxldCBoZWlnaHQgPSBNYXRoLmZsb29yKHdpZHRoIC8gMS42KS8v6L+Z5Liq6aG555uuY2FudmFz55qEd2lkdGgvaGVpZ2h05Li6MS42XHJcbiAgICBsZXQgY2FudmFzSWQgPSAnbXlDYW52YXMnXHJcbiAgICBsZXQgY2FudmFzQ29uZmlnID0ge1xyXG4gICAgICB3aWR0aDogd2lkdGgsXHJcbiAgICAgIGhlaWdodDogaGVpZ2h0LFxyXG4gICAgICBpZDogY2FudmFzSWRcclxuICAgIH1cclxuICAgIGxldCBjb25maWc9Z2V0Q29uZmlnKGNhbnZhc0NvbmZpZylcclxuICAgIGNoYXJ0V3JhcC5iaW5kKHBhZ2VUaGlzKShjb25maWcpXHJcbiAgfVxyXG59XHJcbiJdfQ==