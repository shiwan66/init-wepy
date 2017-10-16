'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (config) {
    var canvasId = config.canvasConfig.id;
    var pageThis = this;
    var ctx = wx.createCanvasContext(canvasId); //wx.createContext已经被废弃
    var gid = 100;
    ctx.gid = gid;
    resetCanvas(pageThis, config.canvasConfig);
    (0, _fixedCtx2.default)(ctx, config.canvasConfig);
    _chart2.default.pluginService.register({
        beforeRender: function beforeRender(chart) {},
        afterDraw: function afterDraw(chart, easing) {
            var ctx = chart.chart.ctx;
            if (ctx.gid == gid) {
                // wx.drawCanvas({//wx.drawCanvas与ctx.getActions已经被废弃
                //     canvasId: canvasId,
                //     actions: ctx.getActions()// 获取绘图动作数组
                // })
                ctx.draw();
            }
        }
    });
    _chart2.default.helpers.addEvent = function (canvas, eventName, method) {
        switch (eventName) {
            case 'touchstart':
                pageThis[canvasId + 'TouchStart'] = method;
                pageThis[canvasId + 'TouchMove'] = method;
                pageThis[canvasId + 'TouchEnd'] = function () {};
                break;
        }
    };
    _chart2.default.helpers.getRelativePosition = function (evt, chart) {
        var touches = evt.changedTouches[0];
        var x = touches.x;
        var y = touches.y;
        console.log(x, y);
        return {
            x: x,
            y: y
        };
    };
    var myChart = new _chart2.default(ctx, config.chartConfig);
    return myChart;
};

var _chart = require('./chart.js');

var _chart2 = _interopRequireDefault(_chart);

var _fixedCtx = require('./fixedCtx.js');

var _fixedCtx2 = _interopRequireDefault(_fixedCtx);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Created by xiabingwu on 2016/11/14.
 */
var app = getApp();

function resetCanvas(pageThis, canvasConfig) {
    var obj = {};
    var key = canvasConfig.id + 'Style';
    obj[key] = {};
    obj[key].width = canvasConfig.width;
    obj[key].height = canvasConfig.height;
    console.log(obj);
    pageThis.setData(obj);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNoYXJ0V3JhcC5qcyJdLCJuYW1lcyI6WyJjb25maWciLCJjYW52YXNJZCIsImNhbnZhc0NvbmZpZyIsImlkIiwicGFnZVRoaXMiLCJjdHgiLCJ3eCIsImNyZWF0ZUNhbnZhc0NvbnRleHQiLCJnaWQiLCJyZXNldENhbnZhcyIsInBsdWdpblNlcnZpY2UiLCJyZWdpc3RlciIsImJlZm9yZVJlbmRlciIsImNoYXJ0IiwiYWZ0ZXJEcmF3IiwiZWFzaW5nIiwiZHJhdyIsImhlbHBlcnMiLCJhZGRFdmVudCIsImNhbnZhcyIsImV2ZW50TmFtZSIsIm1ldGhvZCIsImdldFJlbGF0aXZlUG9zaXRpb24iLCJldnQiLCJ0b3VjaGVzIiwiY2hhbmdlZFRvdWNoZXMiLCJ4IiwieSIsImNvbnNvbGUiLCJsb2ciLCJteUNoYXJ0IiwiY2hhcnRDb25maWciLCJhcHAiLCJnZXRBcHAiLCJvYmoiLCJrZXkiLCJ3aWR0aCIsImhlaWdodCIsInNldERhdGEiXSwibWFwcGluZ3MiOiI7Ozs7OztrQkFNZSxVQUFTQSxNQUFULEVBQWdCO0FBQzNCLFFBQUlDLFdBQVNELE9BQU9FLFlBQVAsQ0FBb0JDLEVBQWpDO0FBQ0EsUUFBSUMsV0FBUyxJQUFiO0FBQ0EsUUFBSUMsTUFBTUMsR0FBR0MsbUJBQUgsQ0FBdUJOLFFBQXZCLENBQVYsQ0FIMkIsQ0FHZTtBQUMxQyxRQUFJTyxNQUFNLEdBQVY7QUFDQUgsUUFBSUcsR0FBSixHQUFVQSxHQUFWO0FBQ0FDLGdCQUFZTCxRQUFaLEVBQXFCSixPQUFPRSxZQUE1QjtBQUNBLDRCQUFTRyxHQUFULEVBQWFMLE9BQU9FLFlBQXBCO0FBQ0Esb0JBQU1RLGFBQU4sQ0FBb0JDLFFBQXBCLENBQTZCO0FBQ3pCQyxzQkFBYyxzQkFBVUMsS0FBVixFQUFpQixDQUU5QixDQUh3QjtBQUl6QkMsbUJBQVcsbUJBQVVELEtBQVYsRUFBaUJFLE1BQWpCLEVBQXlCO0FBQ2hDLGdCQUFJVixNQUFNUSxNQUFNQSxLQUFOLENBQVlSLEdBQXRCO0FBQ0EsZ0JBQUdBLElBQUlHLEdBQUosSUFBU0EsR0FBWixFQUFnQjtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0FILG9CQUFJVyxJQUFKO0FBQ0g7QUFDSjtBQWJ3QixLQUE3QjtBQWVBLG9CQUFNQyxPQUFOLENBQWNDLFFBQWQsR0FBdUIsVUFBU0MsTUFBVCxFQUFnQkMsU0FBaEIsRUFBMEJDLE1BQTFCLEVBQWlDO0FBQ3BELGdCQUFPRCxTQUFQO0FBQ0ksaUJBQUssWUFBTDtBQUNJaEIseUJBQVNILFdBQVMsWUFBbEIsSUFBZ0NvQixNQUFoQztBQUNBakIseUJBQVNILFdBQVMsV0FBbEIsSUFBK0JvQixNQUEvQjtBQUNBakIseUJBQVNILFdBQVMsVUFBbEIsSUFBOEIsWUFBVSxDQUFFLENBQTFDO0FBQ0E7QUFMUjtBQU9ILEtBUkQ7QUFTQSxvQkFBTWdCLE9BQU4sQ0FBY0ssbUJBQWQsR0FBb0MsVUFBU0MsR0FBVCxFQUFjVixLQUFkLEVBQXFCO0FBQ3JELFlBQUlXLFVBQVFELElBQUlFLGNBQUosQ0FBbUIsQ0FBbkIsQ0FBWjtBQUNBLFlBQUlDLElBQUVGLFFBQVFFLENBQWQ7QUFDQSxZQUFJQyxJQUFFSCxRQUFRRyxDQUFkO0FBQ0FDLGdCQUFRQyxHQUFSLENBQVlILENBQVosRUFBY0MsQ0FBZDtBQUNBLGVBQU87QUFDSEQsZUFBRUEsQ0FEQztBQUVIQyxlQUFFQTtBQUZDLFNBQVA7QUFJSCxLQVREO0FBVUEsUUFBSUcsVUFBVSxvQkFBVXpCLEdBQVYsRUFBZUwsT0FBTytCLFdBQXRCLENBQWQ7QUFDQSxXQUFPRCxPQUFQO0FBQ0gsQzs7QUEvQ0Q7Ozs7QUFDQTs7Ozs7O0FBSkE7OztBQUtBLElBQUlFLE1BQU1DLFFBQVY7O0FBOENBLFNBQVN4QixXQUFULENBQXFCTCxRQUFyQixFQUE4QkYsWUFBOUIsRUFBMkM7QUFDdkMsUUFBSWdDLE1BQUksRUFBUjtBQUNBLFFBQUlDLE1BQUlqQyxhQUFhQyxFQUFiLEdBQWdCLE9BQXhCO0FBQ0ErQixRQUFJQyxHQUFKLElBQVMsRUFBVDtBQUNBRCxRQUFJQyxHQUFKLEVBQVNDLEtBQVQsR0FBZWxDLGFBQWFrQyxLQUE1QjtBQUNBRixRQUFJQyxHQUFKLEVBQVNFLE1BQVQsR0FBZ0JuQyxhQUFhbUMsTUFBN0I7QUFDQVQsWUFBUUMsR0FBUixDQUFZSyxHQUFaO0FBQ0E5QixhQUFTa0MsT0FBVCxDQUFpQkosR0FBakI7QUFDSCIsImZpbGUiOiJjaGFydFdyYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ3JlYXRlZCBieSB4aWFiaW5nd3Ugb24gMjAxNi8xMS8xNC5cclxuICovXHJcbmltcG9ydCBDaGFydCBmcm9tICcuL2NoYXJ0J1xyXG5pbXBvcnQgZml4ZWRDdHggZnJvbSAnLi9maXhlZEN0eCdcclxubGV0IGFwcCA9IGdldEFwcCgpXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbmZpZyl7XHJcbiAgICBsZXQgY2FudmFzSWQ9Y29uZmlnLmNhbnZhc0NvbmZpZy5pZFxyXG4gICAgbGV0IHBhZ2VUaGlzPXRoaXNcclxuICAgIGxldCBjdHggPSB3eC5jcmVhdGVDYW52YXNDb250ZXh0KGNhbnZhc0lkKS8vd3guY3JlYXRlQ29udGV4dOW3sue7j+iiq+W6n+W8g1xyXG4gICAgbGV0IGdpZCA9IDEwMFxyXG4gICAgY3R4LmdpZCA9IGdpZFxyXG4gICAgcmVzZXRDYW52YXMocGFnZVRoaXMsY29uZmlnLmNhbnZhc0NvbmZpZylcclxuICAgIGZpeGVkQ3R4KGN0eCxjb25maWcuY2FudmFzQ29uZmlnKVxyXG4gICAgQ2hhcnQucGx1Z2luU2VydmljZS5yZWdpc3Rlcih7XHJcbiAgICAgICAgYmVmb3JlUmVuZGVyOiBmdW5jdGlvbiAoY2hhcnQpIHtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBhZnRlckRyYXc6IGZ1bmN0aW9uIChjaGFydCwgZWFzaW5nKSB7XHJcbiAgICAgICAgICAgIHZhciBjdHggPSBjaGFydC5jaGFydC5jdHhcclxuICAgICAgICAgICAgaWYoY3R4LmdpZD09Z2lkKXtcclxuICAgICAgICAgICAgICAgIC8vIHd4LmRyYXdDYW52YXMoey8vd3guZHJhd0NhbnZhc+S4jmN0eC5nZXRBY3Rpb25z5bey57uP6KKr5bqf5byDXHJcbiAgICAgICAgICAgICAgICAvLyAgICAgY2FudmFzSWQ6IGNhbnZhc0lkLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgIGFjdGlvbnM6IGN0eC5nZXRBY3Rpb25zKCkvLyDojrflj5bnu5jlm77liqjkvZzmlbDnu4RcclxuICAgICAgICAgICAgICAgIC8vIH0pXHJcbiAgICAgICAgICAgICAgICBjdHguZHJhdygpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIENoYXJ0LmhlbHBlcnMuYWRkRXZlbnQ9ZnVuY3Rpb24oY2FudmFzLGV2ZW50TmFtZSxtZXRob2Qpe1xyXG4gICAgICAgIHN3aXRjaChldmVudE5hbWUpe1xyXG4gICAgICAgICAgICBjYXNlICd0b3VjaHN0YXJ0JzpcclxuICAgICAgICAgICAgICAgIHBhZ2VUaGlzW2NhbnZhc0lkKydUb3VjaFN0YXJ0J109bWV0aG9kXHJcbiAgICAgICAgICAgICAgICBwYWdlVGhpc1tjYW52YXNJZCsnVG91Y2hNb3ZlJ109bWV0aG9kXHJcbiAgICAgICAgICAgICAgICBwYWdlVGhpc1tjYW52YXNJZCsnVG91Y2hFbmQnXT1mdW5jdGlvbigpe31cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIENoYXJ0LmhlbHBlcnMuZ2V0UmVsYXRpdmVQb3NpdGlvbiA9IGZ1bmN0aW9uKGV2dCwgY2hhcnQpIHtcclxuICAgICAgICB2YXIgdG91Y2hlcz1ldnQuY2hhbmdlZFRvdWNoZXNbMF1cclxuICAgICAgICB2YXIgeD10b3VjaGVzLnhcclxuICAgICAgICB2YXIgeT10b3VjaGVzLnlcclxuICAgICAgICBjb25zb2xlLmxvZyh4LHkpXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDp4LFxyXG4gICAgICAgICAgICB5OnlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2YXIgbXlDaGFydCA9IG5ldyBDaGFydChjdHgsIGNvbmZpZy5jaGFydENvbmZpZyk7XHJcbiAgICByZXR1cm4gbXlDaGFydDtcclxufVxyXG5mdW5jdGlvbiByZXNldENhbnZhcyhwYWdlVGhpcyxjYW52YXNDb25maWcpe1xyXG4gICAgbGV0IG9iaj17fVxyXG4gICAgbGV0IGtleT1jYW52YXNDb25maWcuaWQrJ1N0eWxlJ1xyXG4gICAgb2JqW2tleV09e307XHJcbiAgICBvYmpba2V5XS53aWR0aD1jYW52YXNDb25maWcud2lkdGhcclxuICAgIG9ialtrZXldLmhlaWdodD1jYW52YXNDb25maWcuaGVpZ2h0XHJcbiAgICBjb25zb2xlLmxvZyhvYmopXHJcbiAgICBwYWdlVGhpcy5zZXREYXRhKG9iailcclxufSJdfQ==