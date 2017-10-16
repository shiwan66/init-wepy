'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (ctx, canvasConfig) {
    String.prototype.realLength = function () {
        return this.replace(/[^\x00-\xff]/g, "**").length;
    };
    ctx.devicePixelRatio = 1;
    if (canvasConfig.width < 305) {
        //for line
        ctx.measureText = function (str) {
            //为了小屏手机
            var lg = ('' + str).length;
            lg = lg * 4;
            return {
                width: lg
            };
        };
    } else {
        ctx.measureText = function (str) {
            var lg = ('' + str).length;
            lg = lg * 5;
            return {
                width: lg
            };
        };
    }
    ctx.measureTextXscale = function (str) {
        var lg = ('' + str).realLength();
        return {
            width: lg
        };
    };
    ctx.measureTextToolTip = function (str) {
        var lg = ('' + str).realLength();
        return {
            width: lg * 5.95
        };
    };
    ctx.canvas = { //微信小程序没有canvas对象，我们造一个
        width: canvasConfig.width,
        height: canvasConfig.height
    };
    ctx.canvas.style = {
        width: ctx.canvas.width,
        height: ctx.canvas.height,
        display: 'block'
        //strokeRect和fillRect方法已经被小程序实现不用封装了
        // ctx.strokeRect = function (x, y, width, height) {
        //     ctx.beginPath()
        //     ctx.rect(x, y, width, height)
        //     ctx.closePath()
        //     ctx.stroke()
        // }
        // ctx.fillRect = function (x, y, width, height) {
        //     ctx.beginPath()
        //     ctx.rect(x, y, width, height)
        //     ctx.closePath()
        //     ctx.fill()
        // }
    };ctx.canvas.getAttribute = function (name) {
        if (name == 'width') {
            return ctx.canvas.width;
        }
        if (name == 'height') {
            return ctx.canvas.height;
        }
    };
    ctx.canvas.id = canvasConfig.id;
    return ctx;
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpeGVkQ3R4LmpzIl0sIm5hbWVzIjpbImN0eCIsImNhbnZhc0NvbmZpZyIsIlN0cmluZyIsInByb3RvdHlwZSIsInJlYWxMZW5ndGgiLCJyZXBsYWNlIiwibGVuZ3RoIiwiZGV2aWNlUGl4ZWxSYXRpbyIsIndpZHRoIiwibWVhc3VyZVRleHQiLCJzdHIiLCJsZyIsIm1lYXN1cmVUZXh0WHNjYWxlIiwibWVhc3VyZVRleHRUb29sVGlwIiwiY2FudmFzIiwiaGVpZ2h0Iiwic3R5bGUiLCJkaXNwbGF5IiwiZ2V0QXR0cmlidXRlIiwibmFtZSIsImlkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7a0JBR2UsVUFBU0EsR0FBVCxFQUFhQyxZQUFiLEVBQTBCO0FBQ3JDQyxXQUFPQyxTQUFQLENBQWlCQyxVQUFqQixHQUE4QixZQUFZO0FBQ3RDLGVBQU8sS0FBS0MsT0FBTCxDQUFhLGVBQWIsRUFBOEIsSUFBOUIsRUFBb0NDLE1BQTNDO0FBQ0gsS0FGRDtBQUdBTixRQUFJTyxnQkFBSixHQUF1QixDQUF2QjtBQUNBLFFBQUdOLGFBQWFPLEtBQWIsR0FBbUIsR0FBdEIsRUFBMEI7QUFBQztBQUN2QlIsWUFBSVMsV0FBSixHQUFrQixVQUFVQyxHQUFWLEVBQWU7QUFBQztBQUM5QixnQkFBSUMsS0FBRyxDQUFDLEtBQUdELEdBQUosRUFBU0osTUFBaEI7QUFDQUssaUJBQUdBLEtBQUcsQ0FBTjtBQUNBLG1CQUFPO0FBQ0hILHVCQUFNRztBQURILGFBQVA7QUFHSCxTQU5EO0FBT0gsS0FSRCxNQVFLO0FBQ0RYLFlBQUlTLFdBQUosR0FBa0IsVUFBVUMsR0FBVixFQUFlO0FBQzdCLGdCQUFJQyxLQUFHLENBQUMsS0FBR0QsR0FBSixFQUFTSixNQUFoQjtBQUNBSyxpQkFBR0EsS0FBRyxDQUFOO0FBQ0EsbUJBQU87QUFDSEgsdUJBQU1HO0FBREgsYUFBUDtBQUdILFNBTkQ7QUFPSDtBQUNEWCxRQUFJWSxpQkFBSixHQUF3QixVQUFVRixHQUFWLEVBQWU7QUFDbkMsWUFBSUMsS0FBRyxDQUFDLEtBQUdELEdBQUosRUFBU04sVUFBVCxFQUFQO0FBQ0EsZUFBTztBQUNISSxtQkFBTUc7QUFESCxTQUFQO0FBR0gsS0FMRDtBQU1BWCxRQUFJYSxrQkFBSixHQUF1QixVQUFTSCxHQUFULEVBQWE7QUFDaEMsWUFBSUMsS0FBRyxDQUFDLEtBQUdELEdBQUosRUFBU04sVUFBVCxFQUFQO0FBQ0EsZUFBTztBQUNISSxtQkFBTUcsS0FBRztBQUROLFNBQVA7QUFHSCxLQUxEO0FBTUFYLFFBQUljLE1BQUosR0FBYSxFQUFDO0FBQ1ZOLGVBQU9QLGFBQWFPLEtBRFg7QUFFVE8sZ0JBQVFkLGFBQWFjO0FBRlosS0FBYjtBQUlBZixRQUFJYyxNQUFKLENBQVdFLEtBQVgsR0FBbUI7QUFDZlIsZUFBT1IsSUFBSWMsTUFBSixDQUFXTixLQURIO0FBRWZPLGdCQUFRZixJQUFJYyxNQUFKLENBQVdDLE1BRko7QUFHZkUsaUJBQVM7QUFFYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQWpCbUIsS0FBbkIsQ0FrQkFqQixJQUFJYyxNQUFKLENBQVdJLFlBQVgsR0FBMEIsVUFBVUMsSUFBVixFQUFnQjtBQUN0QyxZQUFJQSxRQUFRLE9BQVosRUFBcUI7QUFDakIsbUJBQU9uQixJQUFJYyxNQUFKLENBQVdOLEtBQWxCO0FBQ0g7QUFDRCxZQUFJVyxRQUFRLFFBQVosRUFBc0I7QUFDbEIsbUJBQU9uQixJQUFJYyxNQUFKLENBQVdDLE1BQWxCO0FBQ0g7QUFDSixLQVBEO0FBUUFmLFFBQUljLE1BQUosQ0FBV00sRUFBWCxHQUFjbkIsYUFBYW1CLEVBQTNCO0FBQ0EsV0FBT3BCLEdBQVA7QUFDSCxDIiwiZmlsZSI6ImZpeGVkQ3R4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENyZWF0ZWQgYnkgeGlhYmluZ3d1IG9uIDIwMTYvMTEvMjEuXHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjdHgsY2FudmFzQ29uZmlnKXtcclxuICAgIFN0cmluZy5wcm90b3R5cGUucmVhbExlbmd0aCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5yZXBsYWNlKC9bXlxceDAwLVxceGZmXS9nLCBcIioqXCIpLmxlbmd0aDtcclxuICAgIH07XHJcbiAgICBjdHguZGV2aWNlUGl4ZWxSYXRpbyA9IDFcclxuICAgIGlmKGNhbnZhc0NvbmZpZy53aWR0aDwzMDUpey8vZm9yIGxpbmVcclxuICAgICAgICBjdHgubWVhc3VyZVRleHQgPSBmdW5jdGlvbiAoc3RyKSB7Ly/kuLrkuoblsI/lsY/miYvmnLpcclxuICAgICAgICAgICAgdmFyIGxnPSgnJytzdHIpLmxlbmd0aFxyXG4gICAgICAgICAgICBsZz1sZyo0XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB3aWR0aDpsZ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgY3R4Lm1lYXN1cmVUZXh0ID0gZnVuY3Rpb24gKHN0cikge1xyXG4gICAgICAgICAgICB2YXIgbGc9KCcnK3N0cikubGVuZ3RoXHJcbiAgICAgICAgICAgIGxnPWxnKjVcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHdpZHRoOmxnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjdHgubWVhc3VyZVRleHRYc2NhbGUgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgICAgICAgdmFyIGxnPSgnJytzdHIpLnJlYWxMZW5ndGgoKVxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHdpZHRoOmxnXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY3R4Lm1lYXN1cmVUZXh0VG9vbFRpcD1mdW5jdGlvbihzdHIpe1xyXG4gICAgICAgIHZhciBsZz0oJycrc3RyKS5yZWFsTGVuZ3RoKClcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB3aWR0aDpsZyo1Ljk1XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY3R4LmNhbnZhcyA9IHsvL+W+ruS/oeWwj+eoi+W6j+ayoeaciWNhbnZhc+Wvueixoe+8jOaIkeS7rOmAoOS4gOS4qlxyXG4gICAgICAgIHdpZHRoOiBjYW52YXNDb25maWcud2lkdGgsXHJcbiAgICAgICAgaGVpZ2h0OiBjYW52YXNDb25maWcuaGVpZ2h0LFxyXG4gICAgfVxyXG4gICAgY3R4LmNhbnZhcy5zdHlsZSA9IHtcclxuICAgICAgICB3aWR0aDogY3R4LmNhbnZhcy53aWR0aCxcclxuICAgICAgICBoZWlnaHQ6IGN0eC5jYW52YXMuaGVpZ2h0LFxyXG4gICAgICAgIGRpc3BsYXk6ICdibG9jaydcclxuICAgIH1cclxuICAgIC8vc3Ryb2tlUmVjdOWSjGZpbGxSZWN05pa55rOV5bey57uP6KKr5bCP56iL5bqP5a6e546w5LiN55So5bCB6KOF5LqGXHJcbiAgICAvLyBjdHguc3Ryb2tlUmVjdCA9IGZ1bmN0aW9uICh4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgICAvLyAgICAgY3R4LmJlZ2luUGF0aCgpXHJcbiAgICAvLyAgICAgY3R4LnJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodClcclxuICAgIC8vICAgICBjdHguY2xvc2VQYXRoKClcclxuICAgIC8vICAgICBjdHguc3Ryb2tlKClcclxuICAgIC8vIH1cclxuICAgIC8vIGN0eC5maWxsUmVjdCA9IGZ1bmN0aW9uICh4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgICAvLyAgICAgY3R4LmJlZ2luUGF0aCgpXHJcbiAgICAvLyAgICAgY3R4LnJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodClcclxuICAgIC8vICAgICBjdHguY2xvc2VQYXRoKClcclxuICAgIC8vICAgICBjdHguZmlsbCgpXHJcbiAgICAvLyB9XHJcbiAgICBjdHguY2FudmFzLmdldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICAgICAgaWYgKG5hbWUgPT0gJ3dpZHRoJykge1xyXG4gICAgICAgICAgICByZXR1cm4gY3R4LmNhbnZhcy53aWR0aFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmFtZSA9PSAnaGVpZ2h0Jykge1xyXG4gICAgICAgICAgICByZXR1cm4gY3R4LmNhbnZhcy5oZWlnaHRcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjdHguY2FudmFzLmlkPWNhbnZhc0NvbmZpZy5pZFxyXG4gICAgcmV0dXJuIGN0eDtcclxufSJdfQ==