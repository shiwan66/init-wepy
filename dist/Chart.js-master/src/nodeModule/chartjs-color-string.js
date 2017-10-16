"use strict";

/* MIT license */
var colorNames = require('./color-name.js');

module.exports = {
   getRgba: getRgba,
   getHsla: getHsla,
   getRgb: getRgb,
   getHsl: getHsl,
   getHwb: getHwb,
   getAlpha: getAlpha,

   hexString: hexString,
   rgbString: rgbString,
   rgbaString: rgbaString,
   percentString: percentString,
   percentaString: percentaString,
   hslString: hslString,
   hslaString: hslaString,
   hwbString: hwbString,
   keyword: keyword
};

function getRgba(string) {
   if (!string) {
      return;
   }
   var abbr = /^#([a-fA-F0-9]{3})$/,
       hex = /^#([a-fA-F0-9]{6})$/,
       rgba = /^rgba?\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/,
       per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/,
       keyword = /(\w+)/;

   var rgb = [0, 0, 0],
       a = 1,
       match = string.match(abbr);
   if (match) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i] + match[i], 16);
      }
   } else if (match = string.match(hex)) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match.slice(i * 2, i * 2 + 2), 16);
      }
   } else if (match = string.match(rgba)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i + 1]);
      }
      a = parseFloat(match[4]);
   } else if (match = string.match(per)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
      }
      a = parseFloat(match[4]);
   } else if (match = string.match(keyword)) {
      if (match[1] == "transparent") {
         return [0, 0, 0, 0];
      }
      rgb = colorNames[match[1]];
      if (!rgb) {
         return;
      }
   }

   for (var i = 0; i < rgb.length; i++) {
      rgb[i] = scale(rgb[i], 0, 255);
   }
   if (!a && a != 0) {
      a = 1;
   } else {
      a = scale(a, 0, 1);
   }
   rgb[3] = a;
   return rgb;
}

function getHsla(string) {
   if (!string) {
      return;
   }
   var hsl = /^hsla?\(\s*([+-]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)/;
   var match = string.match(hsl);
   if (match) {
      var alpha = parseFloat(match[4]);
      var h = scale(parseInt(match[1]), 0, 360),
          s = scale(parseFloat(match[2]), 0, 100),
          l = scale(parseFloat(match[3]), 0, 100),
          a = scale(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, s, l, a];
   }
}

function getHwb(string) {
   if (!string) {
      return;
   }
   var hwb = /^hwb\(\s*([+-]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)/;
   var match = string.match(hwb);
   if (match) {
      var alpha = parseFloat(match[4]);
      var h = scale(parseInt(match[1]), 0, 360),
          w = scale(parseFloat(match[2]), 0, 100),
          b = scale(parseFloat(match[3]), 0, 100),
          a = scale(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, w, b, a];
   }
}

function getRgb(string) {
   var rgba = getRgba(string);
   return rgba && rgba.slice(0, 3);
}

function getHsl(string) {
   var hsla = getHsla(string);
   return hsla && hsla.slice(0, 3);
}

function getAlpha(string) {
   var vals = getRgba(string);
   if (vals) {
      return vals[3];
   } else if (vals = getHsla(string)) {
      return vals[3];
   } else if (vals = getHwb(string)) {
      return vals[3];
   }
}

// generators
function hexString(rgb) {
   return "#" + hexDouble(rgb[0]) + hexDouble(rgb[1]) + hexDouble(rgb[2]);
}

function rgbString(rgba, alpha) {
   if (alpha < 1 || rgba[3] && rgba[3] < 1) {
      return rgbaString(rgba, alpha);
   }
   return "rgb(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ")";
}

function rgbaString(rgba, alpha) {
   if (alpha === undefined) {
      alpha = rgba[3] !== undefined ? rgba[3] : 1;
   }
   return "rgba(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ", " + alpha + ")";
}

function percentString(rgba, alpha) {
   if (alpha < 1 || rgba[3] && rgba[3] < 1) {
      return percentaString(rgba, alpha);
   }
   var r = Math.round(rgba[0] / 255 * 100),
       g = Math.round(rgba[1] / 255 * 100),
       b = Math.round(rgba[2] / 255 * 100);

   return "rgb(" + r + "%, " + g + "%, " + b + "%)";
}

function percentaString(rgba, alpha) {
   var r = Math.round(rgba[0] / 255 * 100),
       g = Math.round(rgba[1] / 255 * 100),
       b = Math.round(rgba[2] / 255 * 100);
   return "rgba(" + r + "%, " + g + "%, " + b + "%, " + (alpha || rgba[3] || 1) + ")";
}

function hslString(hsla, alpha) {
   if (alpha < 1 || hsla[3] && hsla[3] < 1) {
      return hslaString(hsla, alpha);
   }
   return "hsl(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%)";
}

function hslaString(hsla, alpha) {
   if (alpha === undefined) {
      alpha = hsla[3] !== undefined ? hsla[3] : 1;
   }
   return "hsla(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%, " + alpha + ")";
}

// hwb is a bit different than rgb(a) & hsl(a) since there is no alpha specific syntax
// (hwb have alpha optional & 1 is default value)
function hwbString(hwb, alpha) {
   if (alpha === undefined) {
      alpha = hwb[3] !== undefined ? hwb[3] : 1;
   }
   return "hwb(" + hwb[0] + ", " + hwb[1] + "%, " + hwb[2] + "%" + (alpha !== undefined && alpha !== 1 ? ", " + alpha : "") + ")";
}

function keyword(rgb) {
   return reverseNames[rgb.slice(0, 3)];
}

// helpers
function scale(num, min, max) {
   return Math.min(Math.max(min, num), max);
}

function hexDouble(num) {
   var str = num.toString(16).toUpperCase();
   return str.length < 2 ? "0" + str : str;
}

//create a list of reverse color names
var reverseNames = {};
for (var name in colorNames) {
   reverseNames[colorNames[name]] = name;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNoYXJ0anMtY29sb3Itc3RyaW5nLmpzIl0sIm5hbWVzIjpbImNvbG9yTmFtZXMiLCJyZXF1aXJlIiwibW9kdWxlIiwiZXhwb3J0cyIsImdldFJnYmEiLCJnZXRIc2xhIiwiZ2V0UmdiIiwiZ2V0SHNsIiwiZ2V0SHdiIiwiZ2V0QWxwaGEiLCJoZXhTdHJpbmciLCJyZ2JTdHJpbmciLCJyZ2JhU3RyaW5nIiwicGVyY2VudFN0cmluZyIsInBlcmNlbnRhU3RyaW5nIiwiaHNsU3RyaW5nIiwiaHNsYVN0cmluZyIsImh3YlN0cmluZyIsImtleXdvcmQiLCJzdHJpbmciLCJhYmJyIiwiaGV4IiwicmdiYSIsInBlciIsInJnYiIsImEiLCJtYXRjaCIsImkiLCJsZW5ndGgiLCJwYXJzZUludCIsInNsaWNlIiwicGFyc2VGbG9hdCIsIk1hdGgiLCJyb3VuZCIsInNjYWxlIiwiaHNsIiwiYWxwaGEiLCJoIiwicyIsImwiLCJpc05hTiIsImh3YiIsInciLCJiIiwiaHNsYSIsInZhbHMiLCJoZXhEb3VibGUiLCJ1bmRlZmluZWQiLCJyIiwiZyIsInJldmVyc2VOYW1lcyIsIm51bSIsIm1pbiIsIm1heCIsInN0ciIsInRvU3RyaW5nIiwidG9VcHBlckNhc2UiLCJuYW1lIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0EsSUFBSUEsYUFBYUMsUUFBUSxjQUFSLENBQWpCOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCO0FBQ2RDLFlBQVNBLE9BREs7QUFFZEMsWUFBU0EsT0FGSztBQUdkQyxXQUFRQSxNQUhNO0FBSWRDLFdBQVFBLE1BSk07QUFLZEMsV0FBUUEsTUFMTTtBQU1kQyxhQUFVQSxRQU5JOztBQVFkQyxjQUFXQSxTQVJHO0FBU2RDLGNBQVdBLFNBVEc7QUFVZEMsZUFBWUEsVUFWRTtBQVdkQyxrQkFBZUEsYUFYRDtBQVlkQyxtQkFBZ0JBLGNBWkY7QUFhZEMsY0FBV0EsU0FiRztBQWNkQyxlQUFZQSxVQWRFO0FBZWRDLGNBQVdBLFNBZkc7QUFnQmRDLFlBQVNBO0FBaEJL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QzNCLFVBQU9yQixLQUFLb0IsR0FBTCxDQUFTcEIsS0FBS3FCLEdBQUwsQ0FBU0QsR0FBVCxFQUFjRCxHQUFkLENBQVQsRUFBNkJFLEdBQTdCLENBQVA7QUFDRjs7QUFFRCxTQUFTUCxTQUFULENBQW1CSyxHQUFuQixFQUF3QjtBQUN0QixPQUFJRyxNQUFNSCxJQUFJSSxRQUFKLENBQWEsRUFBYixFQUFpQkMsV0FBakIsRUFBVjtBQUNBLFVBQVFGLElBQUkxQixNQUFKLEdBQWEsQ0FBZCxHQUFtQixNQUFNMEIsR0FBekIsR0FBK0JBLEdBQXRDO0FBQ0Q7O0FBR0Q7QUFDQSxJQUFJSixlQUFlLEVBQW5CO0FBQ0EsS0FBSyxJQUFJTyxJQUFULElBQWlCekQsVUFBakIsRUFBNkI7QUFDMUJrRCxnQkFBYWxELFdBQVd5RCxJQUFYLENBQWIsSUFBaUNBLElBQWpDO0FBQ0YiLCJmaWxlIjoiY2hhcnRqcy1jb2xvci1zdHJpbmcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBNSVQgbGljZW5zZSAqL1xyXG52YXIgY29sb3JOYW1lcyA9IHJlcXVpcmUoJy4vY29sb3ItbmFtZScpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgIGdldFJnYmE6IGdldFJnYmEsXHJcbiAgIGdldEhzbGE6IGdldEhzbGEsXHJcbiAgIGdldFJnYjogZ2V0UmdiLFxyXG4gICBnZXRIc2w6IGdldEhzbCxcclxuICAgZ2V0SHdiOiBnZXRId2IsXHJcbiAgIGdldEFscGhhOiBnZXRBbHBoYSxcclxuXHJcbiAgIGhleFN0cmluZzogaGV4U3RyaW5nLFxyXG4gICByZ2JTdHJpbmc6IHJnYlN0cmluZyxcclxuICAgcmdiYVN0cmluZzogcmdiYVN0cmluZyxcclxuICAgcGVyY2VudFN0cmluZzogcGVyY2VudFN0cmluZyxcclxuICAgcGVyY2VudGFTdHJpbmc6IHBlcmNlbnRhU3RyaW5nLFxyXG4gICBoc2xTdHJpbmc6IGhzbFN0cmluZyxcclxuICAgaHNsYVN0cmluZzogaHNsYVN0cmluZyxcclxuICAgaHdiU3RyaW5nOiBod2JTdHJpbmcsXHJcbiAgIGtleXdvcmQ6IGtleXdvcmRcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UmdiYShzdHJpbmcpIHtcclxuICAgaWYgKCFzdHJpbmcpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICB9XHJcbiAgIHZhciBhYmJyID0gIC9eIyhbYS1mQS1GMC05XXszfSkkLyxcclxuICAgICAgIGhleCA9ICAvXiMoW2EtZkEtRjAtOV17Nn0pJC8sXHJcbiAgICAgICByZ2JhID0gL15yZ2JhP1xcKFxccyooWystXT9cXGQrKVxccyosXFxzKihbKy1dP1xcZCspXFxzKixcXHMqKFsrLV0/XFxkKylcXHMqKD86LFxccyooWystXT9bXFxkXFwuXSspXFxzKik/XFwpJC8sXHJcbiAgICAgICBwZXIgPSAvXnJnYmE/XFwoXFxzKihbKy1dP1tcXGRcXC5dKylcXCVcXHMqLFxccyooWystXT9bXFxkXFwuXSspXFwlXFxzKixcXHMqKFsrLV0/W1xcZFxcLl0rKVxcJVxccyooPzosXFxzKihbKy1dP1tcXGRcXC5dKylcXHMqKT9cXCkkLyxcclxuICAgICAgIGtleXdvcmQgPSAvKFxcdyspLztcclxuXHJcbiAgIHZhciByZ2IgPSBbMCwgMCwgMF0sXHJcbiAgICAgICBhID0gMSxcclxuICAgICAgIG1hdGNoID0gc3RyaW5nLm1hdGNoKGFiYnIpO1xyXG4gICBpZiAobWF0Y2gpIHtcclxuICAgICAgbWF0Y2ggPSBtYXRjaFsxXTtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZ2IubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgcmdiW2ldID0gcGFyc2VJbnQobWF0Y2hbaV0gKyBtYXRjaFtpXSwgMTYpO1xyXG4gICAgICB9XHJcbiAgIH1cclxuICAgZWxzZSBpZiAobWF0Y2ggPSBzdHJpbmcubWF0Y2goaGV4KSkge1xyXG4gICAgICBtYXRjaCA9IG1hdGNoWzFdO1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJnYi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICByZ2JbaV0gPSBwYXJzZUludChtYXRjaC5zbGljZShpICogMiwgaSAqIDIgKyAyKSwgMTYpO1xyXG4gICAgICB9XHJcbiAgIH1cclxuICAgZWxzZSBpZiAobWF0Y2ggPSBzdHJpbmcubWF0Y2gocmdiYSkpIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZ2IubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgcmdiW2ldID0gcGFyc2VJbnQobWF0Y2hbaSArIDFdKTtcclxuICAgICAgfVxyXG4gICAgICBhID0gcGFyc2VGbG9hdChtYXRjaFs0XSk7XHJcbiAgIH1cclxuICAgZWxzZSBpZiAobWF0Y2ggPSBzdHJpbmcubWF0Y2gocGVyKSkge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJnYi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICByZ2JbaV0gPSBNYXRoLnJvdW5kKHBhcnNlRmxvYXQobWF0Y2hbaSArIDFdKSAqIDIuNTUpO1xyXG4gICAgICB9XHJcbiAgICAgIGEgPSBwYXJzZUZsb2F0KG1hdGNoWzRdKTtcclxuICAgfVxyXG4gICBlbHNlIGlmIChtYXRjaCA9IHN0cmluZy5tYXRjaChrZXl3b3JkKSkge1xyXG4gICAgICBpZiAobWF0Y2hbMV0gPT0gXCJ0cmFuc3BhcmVudFwiKSB7XHJcbiAgICAgICAgIHJldHVybiBbMCwgMCwgMCwgMF07XHJcbiAgICAgIH1cclxuICAgICAgcmdiID0gY29sb3JOYW1lc1ttYXRjaFsxXV07XHJcbiAgICAgIGlmICghcmdiKSB7XHJcbiAgICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICB9XHJcblxyXG4gICBmb3IgKHZhciBpID0gMDsgaSA8IHJnYi5sZW5ndGg7IGkrKykge1xyXG4gICAgICByZ2JbaV0gPSBzY2FsZShyZ2JbaV0sIDAsIDI1NSk7XHJcbiAgIH1cclxuICAgaWYgKCFhICYmIGEgIT0gMCkge1xyXG4gICAgICBhID0gMTtcclxuICAgfVxyXG4gICBlbHNlIHtcclxuICAgICAgYSA9IHNjYWxlKGEsIDAsIDEpO1xyXG4gICB9XHJcbiAgIHJnYlszXSA9IGE7XHJcbiAgIHJldHVybiByZ2I7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEhzbGEoc3RyaW5nKSB7XHJcbiAgIGlmICghc3RyaW5nKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgfVxyXG4gICB2YXIgaHNsID0gL15oc2xhP1xcKFxccyooWystXT9cXGQrKSg/OmRlZyk/XFxzKixcXHMqKFsrLV0/W1xcZFxcLl0rKSVcXHMqLFxccyooWystXT9bXFxkXFwuXSspJVxccyooPzosXFxzKihbKy1dP1tcXGRcXC5dKylcXHMqKT9cXCkvO1xyXG4gICB2YXIgbWF0Y2ggPSBzdHJpbmcubWF0Y2goaHNsKTtcclxuICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgIHZhciBhbHBoYSA9IHBhcnNlRmxvYXQobWF0Y2hbNF0pO1xyXG4gICAgICB2YXIgaCA9IHNjYWxlKHBhcnNlSW50KG1hdGNoWzFdKSwgMCwgMzYwKSxcclxuICAgICAgICAgIHMgPSBzY2FsZShwYXJzZUZsb2F0KG1hdGNoWzJdKSwgMCwgMTAwKSxcclxuICAgICAgICAgIGwgPSBzY2FsZShwYXJzZUZsb2F0KG1hdGNoWzNdKSwgMCwgMTAwKSxcclxuICAgICAgICAgIGEgPSBzY2FsZShpc05hTihhbHBoYSkgPyAxIDogYWxwaGEsIDAsIDEpO1xyXG4gICAgICByZXR1cm4gW2gsIHMsIGwsIGFdO1xyXG4gICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEh3YihzdHJpbmcpIHtcclxuICAgaWYgKCFzdHJpbmcpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICB9XHJcbiAgIHZhciBod2IgPSAvXmh3YlxcKFxccyooWystXT9cXGQrKSg/OmRlZyk/XFxzKixcXHMqKFsrLV0/W1xcZFxcLl0rKSVcXHMqLFxccyooWystXT9bXFxkXFwuXSspJVxccyooPzosXFxzKihbKy1dP1tcXGRcXC5dKylcXHMqKT9cXCkvO1xyXG4gICB2YXIgbWF0Y2ggPSBzdHJpbmcubWF0Y2goaHdiKTtcclxuICAgaWYgKG1hdGNoKSB7XHJcbiAgICB2YXIgYWxwaGEgPSBwYXJzZUZsb2F0KG1hdGNoWzRdKTtcclxuICAgICAgdmFyIGggPSBzY2FsZShwYXJzZUludChtYXRjaFsxXSksIDAsIDM2MCksXHJcbiAgICAgICAgICB3ID0gc2NhbGUocGFyc2VGbG9hdChtYXRjaFsyXSksIDAsIDEwMCksXHJcbiAgICAgICAgICBiID0gc2NhbGUocGFyc2VGbG9hdChtYXRjaFszXSksIDAsIDEwMCksXHJcbiAgICAgICAgICBhID0gc2NhbGUoaXNOYU4oYWxwaGEpID8gMSA6IGFscGhhLCAwLCAxKTtcclxuICAgICAgcmV0dXJuIFtoLCB3LCBiLCBhXTtcclxuICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRSZ2Ioc3RyaW5nKSB7XHJcbiAgIHZhciByZ2JhID0gZ2V0UmdiYShzdHJpbmcpO1xyXG4gICByZXR1cm4gcmdiYSAmJiByZ2JhLnNsaWNlKDAsIDMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRIc2woc3RyaW5nKSB7XHJcbiAgdmFyIGhzbGEgPSBnZXRIc2xhKHN0cmluZyk7XHJcbiAgcmV0dXJuIGhzbGEgJiYgaHNsYS5zbGljZSgwLCAzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QWxwaGEoc3RyaW5nKSB7XHJcbiAgIHZhciB2YWxzID0gZ2V0UmdiYShzdHJpbmcpO1xyXG4gICBpZiAodmFscykge1xyXG4gICAgICByZXR1cm4gdmFsc1szXTtcclxuICAgfVxyXG4gICBlbHNlIGlmICh2YWxzID0gZ2V0SHNsYShzdHJpbmcpKSB7XHJcbiAgICAgIHJldHVybiB2YWxzWzNdO1xyXG4gICB9XHJcbiAgIGVsc2UgaWYgKHZhbHMgPSBnZXRId2Ioc3RyaW5nKSkge1xyXG4gICAgICByZXR1cm4gdmFsc1szXTtcclxuICAgfVxyXG59XHJcblxyXG4vLyBnZW5lcmF0b3JzXHJcbmZ1bmN0aW9uIGhleFN0cmluZyhyZ2IpIHtcclxuICAgcmV0dXJuIFwiI1wiICsgaGV4RG91YmxlKHJnYlswXSkgKyBoZXhEb3VibGUocmdiWzFdKVxyXG4gICAgICAgICAgICAgICsgaGV4RG91YmxlKHJnYlsyXSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJnYlN0cmluZyhyZ2JhLCBhbHBoYSkge1xyXG4gICBpZiAoYWxwaGEgPCAxIHx8IChyZ2JhWzNdICYmIHJnYmFbM10gPCAxKSkge1xyXG4gICAgICByZXR1cm4gcmdiYVN0cmluZyhyZ2JhLCBhbHBoYSk7XHJcbiAgIH1cclxuICAgcmV0dXJuIFwicmdiKFwiICsgcmdiYVswXSArIFwiLCBcIiArIHJnYmFbMV0gKyBcIiwgXCIgKyByZ2JhWzJdICsgXCIpXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJnYmFTdHJpbmcocmdiYSwgYWxwaGEpIHtcclxuICAgaWYgKGFscGhhID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgYWxwaGEgPSAocmdiYVszXSAhPT0gdW5kZWZpbmVkID8gcmdiYVszXSA6IDEpO1xyXG4gICB9XHJcbiAgIHJldHVybiBcInJnYmEoXCIgKyByZ2JhWzBdICsgXCIsIFwiICsgcmdiYVsxXSArIFwiLCBcIiArIHJnYmFbMl1cclxuICAgICAgICAgICArIFwiLCBcIiArIGFscGhhICsgXCIpXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBlcmNlbnRTdHJpbmcocmdiYSwgYWxwaGEpIHtcclxuICAgaWYgKGFscGhhIDwgMSB8fCAocmdiYVszXSAmJiByZ2JhWzNdIDwgMSkpIHtcclxuICAgICAgcmV0dXJuIHBlcmNlbnRhU3RyaW5nKHJnYmEsIGFscGhhKTtcclxuICAgfVxyXG4gICB2YXIgciA9IE1hdGgucm91bmQocmdiYVswXS8yNTUgKiAxMDApLFxyXG4gICAgICAgZyA9IE1hdGgucm91bmQocmdiYVsxXS8yNTUgKiAxMDApLFxyXG4gICAgICAgYiA9IE1hdGgucm91bmQocmdiYVsyXS8yNTUgKiAxMDApO1xyXG5cclxuICAgcmV0dXJuIFwicmdiKFwiICsgciArIFwiJSwgXCIgKyBnICsgXCIlLCBcIiArIGIgKyBcIiUpXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBlcmNlbnRhU3RyaW5nKHJnYmEsIGFscGhhKSB7XHJcbiAgIHZhciByID0gTWF0aC5yb3VuZChyZ2JhWzBdLzI1NSAqIDEwMCksXHJcbiAgICAgICBnID0gTWF0aC5yb3VuZChyZ2JhWzFdLzI1NSAqIDEwMCksXHJcbiAgICAgICBiID0gTWF0aC5yb3VuZChyZ2JhWzJdLzI1NSAqIDEwMCk7XHJcbiAgIHJldHVybiBcInJnYmEoXCIgKyByICsgXCIlLCBcIiArIGcgKyBcIiUsIFwiICsgYiArIFwiJSwgXCIgKyAoYWxwaGEgfHwgcmdiYVszXSB8fCAxKSArIFwiKVwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoc2xTdHJpbmcoaHNsYSwgYWxwaGEpIHtcclxuICAgaWYgKGFscGhhIDwgMSB8fCAoaHNsYVszXSAmJiBoc2xhWzNdIDwgMSkpIHtcclxuICAgICAgcmV0dXJuIGhzbGFTdHJpbmcoaHNsYSwgYWxwaGEpO1xyXG4gICB9XHJcbiAgIHJldHVybiBcImhzbChcIiArIGhzbGFbMF0gKyBcIiwgXCIgKyBoc2xhWzFdICsgXCIlLCBcIiArIGhzbGFbMl0gKyBcIiUpXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhzbGFTdHJpbmcoaHNsYSwgYWxwaGEpIHtcclxuICAgaWYgKGFscGhhID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgYWxwaGEgPSAoaHNsYVszXSAhPT0gdW5kZWZpbmVkID8gaHNsYVszXSA6IDEpO1xyXG4gICB9XHJcbiAgIHJldHVybiBcImhzbGEoXCIgKyBoc2xhWzBdICsgXCIsIFwiICsgaHNsYVsxXSArIFwiJSwgXCIgKyBoc2xhWzJdICsgXCIlLCBcIlxyXG4gICAgICAgICAgICsgYWxwaGEgKyBcIilcIjtcclxufVxyXG5cclxuLy8gaHdiIGlzIGEgYml0IGRpZmZlcmVudCB0aGFuIHJnYihhKSAmIGhzbChhKSBzaW5jZSB0aGVyZSBpcyBubyBhbHBoYSBzcGVjaWZpYyBzeW50YXhcclxuLy8gKGh3YiBoYXZlIGFscGhhIG9wdGlvbmFsICYgMSBpcyBkZWZhdWx0IHZhbHVlKVxyXG5mdW5jdGlvbiBod2JTdHJpbmcoaHdiLCBhbHBoYSkge1xyXG4gICBpZiAoYWxwaGEgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBhbHBoYSA9IChod2JbM10gIT09IHVuZGVmaW5lZCA/IGh3YlszXSA6IDEpO1xyXG4gICB9XHJcbiAgIHJldHVybiBcImh3YihcIiArIGh3YlswXSArIFwiLCBcIiArIGh3YlsxXSArIFwiJSwgXCIgKyBod2JbMl0gKyBcIiVcIlxyXG4gICAgICAgICAgICsgKGFscGhhICE9PSB1bmRlZmluZWQgJiYgYWxwaGEgIT09IDEgPyBcIiwgXCIgKyBhbHBoYSA6IFwiXCIpICsgXCIpXCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGtleXdvcmQocmdiKSB7XHJcbiAgcmV0dXJuIHJldmVyc2VOYW1lc1tyZ2Iuc2xpY2UoMCwgMyldO1xyXG59XHJcblxyXG4vLyBoZWxwZXJzXHJcbmZ1bmN0aW9uIHNjYWxlKG51bSwgbWluLCBtYXgpIHtcclxuICAgcmV0dXJuIE1hdGgubWluKE1hdGgubWF4KG1pbiwgbnVtKSwgbWF4KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGV4RG91YmxlKG51bSkge1xyXG4gIHZhciBzdHIgPSBudW0udG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XHJcbiAgcmV0dXJuIChzdHIubGVuZ3RoIDwgMikgPyBcIjBcIiArIHN0ciA6IHN0cjtcclxufVxyXG5cclxuXHJcbi8vY3JlYXRlIGEgbGlzdCBvZiByZXZlcnNlIGNvbG9yIG5hbWVzXHJcbnZhciByZXZlcnNlTmFtZXMgPSB7fTtcclxuZm9yICh2YXIgbmFtZSBpbiBjb2xvck5hbWVzKSB7XHJcbiAgIHJldmVyc2VOYW1lc1tjb2xvck5hbWVzW25hbWVdXSA9IG5hbWU7XHJcbn1cclxuIl19