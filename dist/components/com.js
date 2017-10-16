'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _wepy = require('./../npm/wepy/lib/wepy.js');

var _wepy2 = _interopRequireDefault(_wepy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var List = function (_wepy$component) {
  _inherits(List, _wepy$component);

  function List() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck(this, List);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = List.__proto__ || Object.getPrototypeOf(List)).call.apply(_ref, [this].concat(args))), _this), _initialiseProps.call(_this), _temp), _possibleConstructorReturn(_this, _ret);
  }

  _createClass(List, [{
    key: 'onLoad',
    value: function onLoad() {}
  }]);

  return List;
}(_wepy2.default.component);

var _initialiseProps = function _initialiseProps() {
  var _this2 = this;

  this.data = {
    list: [{
      id: '0',
      title: 'loading'
    }]
  };
  this.events = {
    'index-broadcast': function indexBroadcast() {
      var _ref2;

      var $event = (_ref2 = arguments.length - 1, arguments.length <= _ref2 ? undefined : arguments[_ref2]);
      console.log(_this2.$name + ' receive ' + $event.name + ' from ' + $event.source.name);
    }
  };
  this.methods = {
    tap: function tap() {
      // this.num = this.num + 1
      console.log(this.$name + ' tap');
    },
    add: function add() {
      var len = this.list.length;
      this.list.push({ id: len + 1, title: 'title_' + len });
    }
  };
};

exports.default = List;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbS5qcyJdLCJuYW1lcyI6WyJMaXN0IiwiY29tcG9uZW50IiwiZGF0YSIsImxpc3QiLCJpZCIsInRpdGxlIiwiZXZlbnRzIiwiJGV2ZW50IiwibGVuZ3RoIiwiY29uc29sZSIsImxvZyIsIiRuYW1lIiwibmFtZSIsInNvdXJjZSIsIm1ldGhvZHMiLCJ0YXAiLCJhZGQiLCJsZW4iLCJwdXNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQTs7Ozs7Ozs7Ozs7O0lBRXFCQSxJOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OzZCQTRCVixDQUNSOzs7O0VBN0IrQixlQUFLQyxTOzs7OztPQUNyQ0MsSSxHQUFPO0FBQ0xDLFVBQU0sQ0FDSjtBQUNFQyxVQUFJLEdBRE47QUFFRUMsYUFBTztBQUZULEtBREk7QUFERCxHO09BU1BDLE0sR0FBUztBQUNQLHVCQUFtQiwwQkFBYTtBQUFBOztBQUM5QixVQUFJQyxrQkFBYyxVQUFLQyxNQUFMLEdBQWMsQ0FBNUIsMkRBQUo7QUFDQUMsY0FBUUMsR0FBUixDQUFlLE9BQUtDLEtBQXBCLGlCQUFxQ0osT0FBT0ssSUFBNUMsY0FBeURMLE9BQU9NLE1BQVAsQ0FBY0QsSUFBdkU7QUFDRDtBQUpNLEc7T0FPVEUsTyxHQUFVO0FBQ1JDLE9BRFEsaUJBQ0Y7QUFDSjtBQUNBTixjQUFRQyxHQUFSLENBQVksS0FBS0MsS0FBTCxHQUFhLE1BQXpCO0FBQ0QsS0FKTztBQUtSSyxPQUxRLGlCQUtGO0FBQ0osVUFBSUMsTUFBTSxLQUFLZCxJQUFMLENBQVVLLE1BQXBCO0FBQ0EsV0FBS0wsSUFBTCxDQUFVZSxJQUFWLENBQWUsRUFBRWQsSUFBSWEsTUFBTSxDQUFaLEVBQWVaLE9BQU8sV0FBV1ksR0FBakMsRUFBZjtBQUNEO0FBUk8sRzs7O2tCQWpCU2pCLEkiLCJmaWxlIjoiY29tLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXHJcbmltcG9ydCB3ZXB5IGZyb20gJ3dlcHknXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMaXN0IGV4dGVuZHMgd2VweS5jb21wb25lbnQge1xyXG4gIGRhdGEgPSB7XHJcbiAgICBsaXN0OiBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJzAnLFxyXG4gICAgICAgIHRpdGxlOiAnbG9hZGluZydcclxuICAgICAgfVxyXG4gICAgXVxyXG4gIH1cclxuXHJcbiAgZXZlbnRzID0ge1xyXG4gICAgJ2luZGV4LWJyb2FkY2FzdCc6ICguLi5hcmdzKSA9PiB7XHJcbiAgICAgIGxldCAkZXZlbnQgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV1cclxuICAgICAgY29uc29sZS5sb2coYCR7dGhpcy4kbmFtZX0gcmVjZWl2ZSAkeyRldmVudC5uYW1lfSBmcm9tICR7JGV2ZW50LnNvdXJjZS5uYW1lfWApXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBtZXRob2RzID0ge1xyXG4gICAgdGFwKCkge1xyXG4gICAgICAvLyB0aGlzLm51bSA9IHRoaXMubnVtICsgMVxyXG4gICAgICBjb25zb2xlLmxvZyh0aGlzLiRuYW1lICsgJyB0YXAnKVxyXG4gICAgfSxcclxuICAgIGFkZCgpIHtcclxuICAgICAgbGV0IGxlbiA9IHRoaXMubGlzdC5sZW5ndGhcclxuICAgICAgdGhpcy5saXN0LnB1c2goeyBpZDogbGVuICsgMSwgdGl0bGU6ICd0aXRsZV8nICsgbGVuIH0pXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbkxvYWQoKSB7XHJcbiAgfVxyXG59XHJcbiJdfQ==