/* global window: false */
/* global document: false */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var color = require('./../nodeModule/chartjs-color.js');

module.exports = function (Chart) {
	// Global Chart helpers object for utility methods and classes
	var helpers = Chart.helpers = {};

	// -- Basic js utility methods
	helpers.each = function (loopable, callback, self, reverse) {
		// Check to see if null or undefined firstly.
		var i, len;
		if (helpers.isArray(loopable)) {
			len = loopable.length;
			if (reverse) {
				for (i = len - 1; i >= 0; i--) {
					callback.call(self, loopable[i], i);
				}
			} else {
				for (i = 0; i < len; i++) {
					callback.call(self, loopable[i], i);
				}
			}
		} else if ((typeof loopable === 'undefined' ? 'undefined' : _typeof(loopable)) === 'object') {
			var keys = Object.keys(loopable);
			len = keys.length;
			for (i = 0; i < len; i++) {
				callback.call(self, loopable[keys[i]], keys[i]);
			}
		}
	};
	helpers.clone = function (obj) {
		var objClone = {};
		helpers.each(obj, function (value, key) {
			if (helpers.isArray(value)) {
				objClone[key] = value.slice(0);
			} else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && value !== null) {
				objClone[key] = helpers.clone(value);
			} else {
				objClone[key] = value;
			}
		});
		return objClone;
	};
	helpers.extend = function (base) {
		var setFn = function setFn(value, key) {
			base[key] = value;
		};
		for (var i = 1, ilen = arguments.length; i < ilen; i++) {
			helpers.each(arguments[i], setFn);
		}
		return base;
	};
	// Need a special merge function to chart configs since they are now grouped
	helpers.configMerge = function (_base) {
		var base = helpers.clone(_base);
		helpers.each(Array.prototype.slice.call(arguments, 1), function (extension) {
			helpers.each(extension, function (value, key) {
				var baseHasProperty = base.hasOwnProperty(key);
				var baseVal = baseHasProperty ? base[key] : {};

				if (key === 'scales') {
					// Scale config merging is complex. Add our own function here for that
					base[key] = helpers.scaleMerge(baseVal, value);
				} else if (key === 'scale') {
					// Used in polar area & radar charts since there is only one scale
					base[key] = helpers.configMerge(baseVal, Chart.scaleService.getScaleDefaults(value.type), value);
				} else if (baseHasProperty && (typeof baseVal === 'undefined' ? 'undefined' : _typeof(baseVal)) === 'object' && !helpers.isArray(baseVal) && baseVal !== null && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && !helpers.isArray(value)) {
					// If we are overwriting an object with an object, do a merge of the properties.
					base[key] = helpers.configMerge(baseVal, value);
				} else {
					// can just overwrite the value in this case
					base[key] = value;
				}
			});
		});

		return base;
	};
	helpers.scaleMerge = function (_base, extension) {
		var base = helpers.clone(_base);

		helpers.each(extension, function (value, key) {
			if (key === 'xAxes' || key === 'yAxes') {
				// These properties are arrays of items
				if (base.hasOwnProperty(key)) {
					helpers.each(value, function (valueObj, index) {
						var axisType = helpers.getValueOrDefault(valueObj.type, key === 'xAxes' ? 'category' : 'linear');
						var axisDefaults = Chart.scaleService.getScaleDefaults(axisType);
						if (index >= base[key].length || !base[key][index].type) {
							base[key].push(helpers.configMerge(axisDefaults, valueObj));
						} else if (valueObj.type && valueObj.type !== base[key][index].type) {
							// Type changed. Bring in the new defaults before we bring in valueObj so that valueObj can override the correct scale defaults
							base[key][index] = helpers.configMerge(base[key][index], axisDefaults, valueObj);
						} else {
							// Type is the same
							base[key][index] = helpers.configMerge(base[key][index], valueObj);
						}
					});
				} else {
					base[key] = [];
					helpers.each(value, function (valueObj) {
						var axisType = helpers.getValueOrDefault(valueObj.type, key === 'xAxes' ? 'category' : 'linear');
						base[key].push(helpers.configMerge(Chart.scaleService.getScaleDefaults(axisType), valueObj));
					});
				}
			} else if (base.hasOwnProperty(key) && _typeof(base[key]) === 'object' && base[key] !== null && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
				// If we are overwriting an object with an object, do a merge of the properties.
				base[key] = helpers.configMerge(base[key], value);
			} else {
				// can just overwrite the value in this case
				base[key] = value;
			}
		});

		return base;
	};
	helpers.getValueAtIndexOrDefault = function (value, index, defaultValue) {
		if (value === undefined || value === null) {
			return defaultValue;
		}

		if (helpers.isArray(value)) {
			return index < value.length ? value[index] : defaultValue;
		}

		return value;
	};
	helpers.getValueOrDefault = function (value, defaultValue) {
		return value === undefined ? defaultValue : value;
	};
	helpers.indexOf = Array.prototype.indexOf ? function (array, item) {
		return array.indexOf(item);
	} : function (array, item) {
		for (var i = 0, ilen = array.length; i < ilen; ++i) {
			if (array[i] === item) {
				return i;
			}
		}
		return -1;
	};
	helpers.where = function (collection, filterCallback) {
		if (helpers.isArray(collection) && Array.prototype.filter) {
			return collection.filter(filterCallback);
		}
		var filtered = [];

		helpers.each(collection, function (item) {
			if (filterCallback(item)) {
				filtered.push(item);
			}
		});

		return filtered;
	};
	helpers.findIndex = Array.prototype.findIndex ? function (array, callback, scope) {
		return array.findIndex(callback, scope);
	} : function (array, callback, scope) {
		scope = scope === undefined ? array : scope;
		for (var i = 0, ilen = array.length; i < ilen; ++i) {
			if (callback.call(scope, array[i], i, array)) {
				return i;
			}
		}
		return -1;
	};
	helpers.findNextWhere = function (arrayToSearch, filterCallback, startIndex) {
		// Default to start of the array
		if (startIndex === undefined || startIndex === null) {
			startIndex = -1;
		}
		for (var i = startIndex + 1; i < arrayToSearch.length; i++) {
			var currentItem = arrayToSearch[i];
			if (filterCallback(currentItem)) {
				return currentItem;
			}
		}
	};
	helpers.findPreviousWhere = function (arrayToSearch, filterCallback, startIndex) {
		// Default to end of the array
		if (startIndex === undefined || startIndex === null) {
			startIndex = arrayToSearch.length;
		}
		for (var i = startIndex - 1; i >= 0; i--) {
			var currentItem = arrayToSearch[i];
			if (filterCallback(currentItem)) {
				return currentItem;
			}
		}
	};
	helpers.inherits = function (extensions) {
		// Basic javascript inheritance based on the model created in Backbone.js
		var me = this;
		var ChartElement = extensions && extensions.hasOwnProperty('constructor') ? extensions.constructor : function () {
			return me.apply(this, arguments);
		};

		var Surrogate = function Surrogate() {
			this.constructor = ChartElement;
		};
		Surrogate.prototype = me.prototype;
		ChartElement.prototype = new Surrogate();

		ChartElement.extend = helpers.inherits;

		if (extensions) {
			helpers.extend(ChartElement.prototype, extensions);
		}

		ChartElement.__super__ = me.prototype;

		return ChartElement;
	};
	helpers.noop = function () {};
	helpers.uid = function () {
		var id = 0;
		return function () {
			return id++;
		};
	}();
	// -- Math methods
	helpers.isNumber = function (n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	};
	helpers.almostEquals = function (x, y, epsilon) {
		return Math.abs(x - y) < epsilon;
	};
	helpers.max = function (array) {
		return array.reduce(function (max, value) {
			if (!isNaN(value)) {
				return Math.max(max, value);
			}
			return max;
		}, Number.NEGATIVE_INFINITY);
	};
	helpers.min = function (array) {
		return array.reduce(function (min, value) {
			if (!isNaN(value)) {
				return Math.min(min, value);
			}
			return min;
		}, Number.POSITIVE_INFINITY);
	};
	helpers.sign = Math.sign ? function (x) {
		return Math.sign(x);
	} : function (x) {
		x = +x; // convert to a number
		if (x === 0 || isNaN(x)) {
			return x;
		}
		return x > 0 ? 1 : -1;
	};
	helpers.log10 = Math.log10 ? function (x) {
		return Math.log10(x);
	} : function (x) {
		return Math.log(x) / Math.LN10;
	};
	helpers.toRadians = function (degrees) {
		return degrees * (Math.PI / 180);
	};
	helpers.toDegrees = function (radians) {
		return radians * (180 / Math.PI);
	};
	// Gets the angle from vertical upright to the point about a centre.
	helpers.getAngleFromPoint = function (centrePoint, anglePoint) {
		var distanceFromXCenter = anglePoint.x - centrePoint.x,
		    distanceFromYCenter = anglePoint.y - centrePoint.y,
		    radialDistanceFromCenter = Math.sqrt(distanceFromXCenter * distanceFromXCenter + distanceFromYCenter * distanceFromYCenter);

		var angle = Math.atan2(distanceFromYCenter, distanceFromXCenter);

		if (angle < -0.5 * Math.PI) {
			angle += 2.0 * Math.PI; // make sure the returned angle is in the range of (-PI/2, 3PI/2]
		}

		return {
			angle: angle,
			distance: radialDistanceFromCenter
		};
	};
	helpers.distanceBetweenPoints = function (pt1, pt2) {
		return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
	};
	helpers.aliasPixel = function (pixelWidth) {
		return pixelWidth % 2 === 0 ? 0 : 0.5;
	};
	helpers.splineCurve = function (firstPoint, middlePoint, afterPoint, t) {
		// Props to Rob Spencer at scaled innovation for his post on splining between points
		// http://scaledinnovation.com/analytics/splines/aboutSplines.html

		// This function must also respect "skipped" points

		var previous = firstPoint.skip ? middlePoint : firstPoint,
		    current = middlePoint,
		    next = afterPoint.skip ? middlePoint : afterPoint;

		var d01 = Math.sqrt(Math.pow(current.x - previous.x, 2) + Math.pow(current.y - previous.y, 2));
		var d12 = Math.sqrt(Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2));

		var s01 = d01 / (d01 + d12);
		var s12 = d12 / (d01 + d12);

		// If all points are the same, s01 & s02 will be inf
		s01 = isNaN(s01) ? 0 : s01;
		s12 = isNaN(s12) ? 0 : s12;

		var fa = t * s01; // scaling factor for triangle Ta
		var fb = t * s12;

		return {
			previous: {
				x: current.x - fa * (next.x - previous.x),
				y: current.y - fa * (next.y - previous.y)
			},
			next: {
				x: current.x + fb * (next.x - previous.x),
				y: current.y + fb * (next.y - previous.y)
			}
		};
	};
	helpers.EPSILON = Number.EPSILON || 1e-14;
	helpers.splineCurveMonotone = function (points) {
		// This function calculates Bézier control points in a similar way than |splineCurve|,
		// but preserves monotonicity of the provided data and ensures no local extremums are added
		// between the dataset discrete points due to the interpolation.
		// See : https://en.wikipedia.org/wiki/Monotone_cubic_interpolation

		var pointsWithTangents = (points || []).map(function (point) {
			return {
				model: point._model,
				deltaK: 0,
				mK: 0
			};
		});

		// Calculate slopes (deltaK) and initialize tangents (mK)
		var pointsLen = pointsWithTangents.length;
		var i, pointBefore, pointCurrent, pointAfter;
		for (i = 0; i < pointsLen; ++i) {
			pointCurrent = pointsWithTangents[i];
			if (pointCurrent.model.skip) {
				continue;
			}

			pointBefore = i > 0 ? pointsWithTangents[i - 1] : null;
			pointAfter = i < pointsLen - 1 ? pointsWithTangents[i + 1] : null;
			if (pointAfter && !pointAfter.model.skip) {
				pointCurrent.deltaK = (pointAfter.model.y - pointCurrent.model.y) / (pointAfter.model.x - pointCurrent.model.x);
			}

			if (!pointBefore || pointBefore.model.skip) {
				pointCurrent.mK = pointCurrent.deltaK;
			} else if (!pointAfter || pointAfter.model.skip) {
				pointCurrent.mK = pointBefore.deltaK;
			} else if (this.sign(pointBefore.deltaK) !== this.sign(pointCurrent.deltaK)) {
				pointCurrent.mK = 0;
			} else {
				pointCurrent.mK = (pointBefore.deltaK + pointCurrent.deltaK) / 2;
			}
		}

		// Adjust tangents to ensure monotonic properties
		var alphaK, betaK, tauK, squaredMagnitude;
		for (i = 0; i < pointsLen - 1; ++i) {
			pointCurrent = pointsWithTangents[i];
			pointAfter = pointsWithTangents[i + 1];
			if (pointCurrent.model.skip || pointAfter.model.skip) {
				continue;
			}

			if (helpers.almostEquals(pointCurrent.deltaK, 0, this.EPSILON)) {
				pointCurrent.mK = pointAfter.mK = 0;
				continue;
			}

			alphaK = pointCurrent.mK / pointCurrent.deltaK;
			betaK = pointAfter.mK / pointCurrent.deltaK;
			squaredMagnitude = Math.pow(alphaK, 2) + Math.pow(betaK, 2);
			if (squaredMagnitude <= 9) {
				continue;
			}

			tauK = 3 / Math.sqrt(squaredMagnitude);
			pointCurrent.mK = alphaK * tauK * pointCurrent.deltaK;
			pointAfter.mK = betaK * tauK * pointCurrent.deltaK;
		}

		// Compute control points
		var deltaX;
		for (i = 0; i < pointsLen; ++i) {
			pointCurrent = pointsWithTangents[i];
			if (pointCurrent.model.skip) {
				continue;
			}

			pointBefore = i > 0 ? pointsWithTangents[i - 1] : null;
			pointAfter = i < pointsLen - 1 ? pointsWithTangents[i + 1] : null;
			if (pointBefore && !pointBefore.model.skip) {
				deltaX = (pointCurrent.model.x - pointBefore.model.x) / 3;
				pointCurrent.model.controlPointPreviousX = pointCurrent.model.x - deltaX;
				pointCurrent.model.controlPointPreviousY = pointCurrent.model.y - deltaX * pointCurrent.mK;
			}
			if (pointAfter && !pointAfter.model.skip) {
				deltaX = (pointAfter.model.x - pointCurrent.model.x) / 3;
				pointCurrent.model.controlPointNextX = pointCurrent.model.x + deltaX;
				pointCurrent.model.controlPointNextY = pointCurrent.model.y + deltaX * pointCurrent.mK;
			}
		}
	};
	helpers.nextItem = function (collection, index, loop) {
		if (loop) {
			return index >= collection.length - 1 ? collection[0] : collection[index + 1];
		}
		return index >= collection.length - 1 ? collection[collection.length - 1] : collection[index + 1];
	};
	helpers.previousItem = function (collection, index, loop) {
		if (loop) {
			return index <= 0 ? collection[collection.length - 1] : collection[index - 1];
		}
		return index <= 0 ? collection[0] : collection[index - 1];
	};
	// Implementation of the nice number algorithm used in determining where axis labels will go
	helpers.niceNum = function (range, round) {
		var exponent = Math.floor(helpers.log10(range));
		var fraction = range / Math.pow(10, exponent);
		var niceFraction;

		if (round) {
			if (fraction < 1.5) {
				niceFraction = 1;
			} else if (fraction < 3) {
				niceFraction = 2;
			} else if (fraction < 7) {
				niceFraction = 5;
			} else {
				niceFraction = 10;
			}
		} else if (fraction <= 1.0) {
			niceFraction = 1;
		} else if (fraction <= 2) {
			niceFraction = 2;
		} else if (fraction <= 5) {
			niceFraction = 5;
		} else {
			niceFraction = 10;
		}

		return niceFraction * Math.pow(10, exponent);
	};
	// Easing functions adapted from Robert Penner's easing equations
	// http://www.robertpenner.com/easing/
	var easingEffects = helpers.easingEffects = {
		linear: function linear(t) {
			return t;
		},
		easeInQuad: function easeInQuad(t) {
			return t * t;
		},
		easeOutQuad: function easeOutQuad(t) {
			return -1 * t * (t - 2);
		},
		easeInOutQuad: function easeInOutQuad(t) {
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * t * t;
			}
			return -1 / 2 * (--t * (t - 2) - 1);
		},
		easeInCubic: function easeInCubic(t) {
			return t * t * t;
		},
		easeOutCubic: function easeOutCubic(t) {
			return 1 * ((t = t / 1 - 1) * t * t + 1);
		},
		easeInOutCubic: function easeInOutCubic(t) {
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * t * t * t;
			}
			return 1 / 2 * ((t -= 2) * t * t + 2);
		},
		easeInQuart: function easeInQuart(t) {
			return t * t * t * t;
		},
		easeOutQuart: function easeOutQuart(t) {
			return -1 * ((t = t / 1 - 1) * t * t * t - 1);
		},
		easeInOutQuart: function easeInOutQuart(t) {
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * t * t * t * t;
			}
			return -1 / 2 * ((t -= 2) * t * t * t - 2);
		},
		easeInQuint: function easeInQuint(t) {
			return 1 * (t /= 1) * t * t * t * t;
		},
		easeOutQuint: function easeOutQuint(t) {
			return 1 * ((t = t / 1 - 1) * t * t * t * t + 1);
		},
		easeInOutQuint: function easeInOutQuint(t) {
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * t * t * t * t * t;
			}
			return 1 / 2 * ((t -= 2) * t * t * t * t + 2);
		},
		easeInSine: function easeInSine(t) {
			return -1 * Math.cos(t / 1 * (Math.PI / 2)) + 1;
		},
		easeOutSine: function easeOutSine(t) {
			return 1 * Math.sin(t / 1 * (Math.PI / 2));
		},
		easeInOutSine: function easeInOutSine(t) {
			return -1 / 2 * (Math.cos(Math.PI * t / 1) - 1);
		},
		easeInExpo: function easeInExpo(t) {
			return t === 0 ? 1 : 1 * Math.pow(2, 10 * (t / 1 - 1));
		},
		easeOutExpo: function easeOutExpo(t) {
			return t === 1 ? 1 : 1 * (-Math.pow(2, -10 * t / 1) + 1);
		},
		easeInOutExpo: function easeInOutExpo(t) {
			if (t === 0) {
				return 0;
			}
			if (t === 1) {
				return 1;
			}
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * Math.pow(2, 10 * (t - 1));
			}
			return 1 / 2 * (-Math.pow(2, -10 * --t) + 2);
		},
		easeInCirc: function easeInCirc(t) {
			if (t >= 1) {
				return t;
			}
			return -1 * (Math.sqrt(1 - (t /= 1) * t) - 1);
		},
		easeOutCirc: function easeOutCirc(t) {
			return 1 * Math.sqrt(1 - (t = t / 1 - 1) * t);
		},
		easeInOutCirc: function easeInOutCirc(t) {
			if ((t /= 1 / 2) < 1) {
				return -1 / 2 * (Math.sqrt(1 - t * t) - 1);
			}
			return 1 / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1);
		},
		easeInElastic: function easeInElastic(t) {
			var s = 1.70158;
			var p = 0;
			var a = 1;
			if (t === 0) {
				return 0;
			}
			if ((t /= 1) === 1) {
				return 1;
			}
			if (!p) {
				p = 1 * 0.3;
			}
			if (a < Math.abs(1)) {
				a = 1;
				s = p / 4;
			} else {
				s = p / (2 * Math.PI) * Math.asin(1 / a);
			}
			return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
		},
		easeOutElastic: function easeOutElastic(t) {
			var s = 1.70158;
			var p = 0;
			var a = 1;
			if (t === 0) {
				return 0;
			}
			if ((t /= 1) === 1) {
				return 1;
			}
			if (!p) {
				p = 1 * 0.3;
			}
			if (a < Math.abs(1)) {
				a = 1;
				s = p / 4;
			} else {
				s = p / (2 * Math.PI) * Math.asin(1 / a);
			}
			return a * Math.pow(2, -10 * t) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) + 1;
		},
		easeInOutElastic: function easeInOutElastic(t) {
			var s = 1.70158;
			var p = 0;
			var a = 1;
			if (t === 0) {
				return 0;
			}
			if ((t /= 1 / 2) === 2) {
				return 1;
			}
			if (!p) {
				p = 1 * (0.3 * 1.5);
			}
			if (a < Math.abs(1)) {
				a = 1;
				s = p / 4;
			} else {
				s = p / (2 * Math.PI) * Math.asin(1 / a);
			}
			if (t < 1) {
				return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
			}
			return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) * 0.5 + 1;
		},
		easeInBack: function easeInBack(t) {
			var s = 1.70158;
			return 1 * (t /= 1) * t * ((s + 1) * t - s);
		},
		easeOutBack: function easeOutBack(t) {
			var s = 1.70158;
			return 1 * ((t = t / 1 - 1) * t * ((s + 1) * t + s) + 1);
		},
		easeInOutBack: function easeInOutBack(t) {
			var s = 1.70158;
			if ((t /= 1 / 2) < 1) {
				return 1 / 2 * (t * t * (((s *= 1.525) + 1) * t - s));
			}
			return 1 / 2 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2);
		},
		easeInBounce: function easeInBounce(t) {
			return 1 - easingEffects.easeOutBounce(1 - t);
		},
		easeOutBounce: function easeOutBounce(t) {
			if ((t /= 1) < 1 / 2.75) {
				return 1 * (7.5625 * t * t);
			} else if (t < 2 / 2.75) {
				return 1 * (7.5625 * (t -= 1.5 / 2.75) * t + 0.75);
			} else if (t < 2.5 / 2.75) {
				return 1 * (7.5625 * (t -= 2.25 / 2.75) * t + 0.9375);
			}
			return 1 * (7.5625 * (t -= 2.625 / 2.75) * t + 0.984375);
		},
		easeInOutBounce: function easeInOutBounce(t) {
			if (t < 1 / 2) {
				return easingEffects.easeInBounce(t * 2) * 0.5;
			}
			return easingEffects.easeOutBounce(t * 2 - 1) * 0.5 + 1 * 0.5;
		}
	};
	// Request animation polyfill - http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
	helpers.requestAnimFrame = function () {
		return function (callback) {
			return setTimeout(callback, 1000 / 60);
		};
	}();
	helpers.cancelAnimFrame = function () {
		return function (callback) {
			return clearTimeout(callback, 1000 / 60);
		};
	}();
	// -- DOM methods
	helpers.getRelativePosition = function (evt, chart) {
		var mouseX, mouseY;
		var e = evt.originalEvent || evt,
		    canvas = evt.currentTarget || evt.srcElement,
		    boundingRect = canvas.getBoundingClientRect();

		var touches = e.touches;
		if (touches && touches.length > 0) {
			mouseX = touches[0].clientX;
			mouseY = touches[0].clientY;
		} else {
			mouseX = e.clientX;
			mouseY = e.clientY;
		}

		// Scale mouse coordinates into canvas coordinates
		// by following the pattern laid out by 'jerryj' in the comments of
		// http://www.html5canvastutorials.com/advanced/html5-canvas-mouse-coordinates/
		var paddingLeft = parseFloat(helpers.getStyle(canvas, 'padding-left'));
		var paddingTop = parseFloat(helpers.getStyle(canvas, 'padding-top'));
		var paddingRight = parseFloat(helpers.getStyle(canvas, 'padding-right'));
		var paddingBottom = parseFloat(helpers.getStyle(canvas, 'padding-bottom'));
		var width = boundingRect.right - boundingRect.left - paddingLeft - paddingRight;
		var height = boundingRect.bottom - boundingRect.top - paddingTop - paddingBottom;

		// We divide by the current device pixel ratio, because the canvas is scaled up by that amount in each direction. However
		// the backend model is in unscaled coordinates. Since we are going to deal with our model coordinates, we go back here
		mouseX = Math.round((mouseX - boundingRect.left - paddingLeft) / width * canvas.width / chart.currentDevicePixelRatio);
		mouseY = Math.round((mouseY - boundingRect.top - paddingTop) / height * canvas.height / chart.currentDevicePixelRatio);

		return {
			x: mouseX,
			y: mouseY
		};
	};
	helpers.addEvent = function (node, eventType, method) {
		if (node.addEventListener) {
			node.addEventListener(eventType, method);
		} else if (node.attachEvent) {
			node.attachEvent('on' + eventType, method);
		} else {
			node['on' + eventType] = method;
		}
	};
	helpers.removeEvent = function (node, eventType, handler) {
		if (node.removeEventListener) {
			node.removeEventListener(eventType, handler, false);
		} else if (node.detachEvent) {
			node.detachEvent('on' + eventType, handler);
		} else {
			node['on' + eventType] = helpers.noop;
		}
	};
	helpers.bindEvents = function (chartInstance, arrayOfEvents, handler) {
		// Create the events object if it's not already present
		var events = chartInstance.events = chartInstance.events || {};

		helpers.each(arrayOfEvents, function (eventName) {
			events[eventName] = function () {
				handler.apply(chartInstance, arguments);
			};
			helpers.addEvent(chartInstance.chart.canvas, eventName, events[eventName]);
		});
	};
	helpers.unbindEvents = function (chartInstance, arrayOfEvents) {
		var canvas = chartInstance.chart.canvas;
		helpers.each(arrayOfEvents, function (handler, eventName) {
			helpers.removeEvent(canvas, eventName, handler);
		});
	};

	// Private helper function to convert max-width/max-height values that may be percentages into a number
	function parseMaxStyle(styleValue, node, parentProperty) {
		var valueInPixels;
		if (typeof styleValue === 'string') {
			valueInPixels = parseInt(styleValue, 10);

			if (styleValue.indexOf('%') !== -1) {
				// percentage * size in dimension
				valueInPixels = valueInPixels / 100 * node.parentNode[parentProperty];
			}
		} else {
			valueInPixels = styleValue;
		}

		return valueInPixels;
	}

	/**
  * Returns if the given value contains an effective constraint.
  * @private
  */
	function isConstrainedValue(value) {
		return value !== undefined && value !== null && value !== 'none';
	}

	// Private helper to get a constraint dimension
	// @param domNode : the node to check the constraint on
	// @param maxStyle : the style that defines the maximum for the direction we are using (maxWidth / maxHeight)
	// @param percentageProperty : property of parent to use when calculating width as a percentage
	// @see http://www.nathanaeljones.com/blog/2013/reading-max-width-cross-browser
	function getConstraintDimension(domNode, maxStyle, percentageProperty) {
		var view = document.defaultView;
		var parentNode = domNode.parentNode;
		var constrainedNode = view.getComputedStyle(domNode)[maxStyle];
		var constrainedContainer = view.getComputedStyle(parentNode)[maxStyle];
		var hasCNode = isConstrainedValue(constrainedNode);
		var hasCContainer = isConstrainedValue(constrainedContainer);
		var infinity = Number.POSITIVE_INFINITY;

		if (hasCNode || hasCContainer) {
			return Math.min(hasCNode ? parseMaxStyle(constrainedNode, domNode, percentageProperty) : infinity, hasCContainer ? parseMaxStyle(constrainedContainer, parentNode, percentageProperty) : infinity);
		}

		return 'none';
	}
	// returns Number or undefined if no constraint
	helpers.getConstraintWidth = function (domNode) {
		return getConstraintDimension(domNode, 'max-width', 'clientWidth');
	};
	// returns Number or undefined if no constraint
	helpers.getConstraintHeight = function (domNode) {
		return getConstraintDimension(domNode, 'max-height', 'clientHeight');
	};
	helpers.getMaximumWidth = function (domNode) {
		return domNode.style.width; //直接用canvas宽度
		var container = domNode.parentNode;
		var paddingLeft = parseInt(helpers.getStyle(container, 'padding-left'), 10);
		var paddingRight = parseInt(helpers.getStyle(container, 'padding-right'), 10);
		var w = container.clientWidth - paddingLeft - paddingRight;
		var cw = helpers.getConstraintWidth(domNode);
		return isNaN(cw) ? w : Math.min(w, cw);
	};
	helpers.getMaximumHeight = function (domNode) {
		return domNode.style.height; //直接用canvas高度
		var container = domNode.parentNode;
		var paddingTop = parseInt(helpers.getStyle(container, 'padding-top'), 10);
		var paddingBottom = parseInt(helpers.getStyle(container, 'padding-bottom'), 10);
		var h = container.clientHeight - paddingTop - paddingBottom;
		var ch = helpers.getConstraintHeight(domNode);
		return isNaN(ch) ? h : Math.min(h, ch);
	};
	helpers.getStyle = function (el, property) {
		return el.currentStyle ? el.currentStyle[property] : document.defaultView.getComputedStyle(el, null).getPropertyValue(property);
	};
	helpers.retinaScale = function (chart) {
		var ctx = chart.ctx;
		var canvas = chart.canvas;
		var width = canvas.width;
		var height = canvas.height;
		var pixelRatio = chart.currentDevicePixelRatio = ctx.devicePixelRatio || 1;

		if (pixelRatio !== 1) {
			canvas.height = height * pixelRatio;
			canvas.width = width * pixelRatio;
			ctx.scale(pixelRatio, pixelRatio);

			// Store the device pixel ratio so that we can go backwards in `destroy`.
			// The devicePixelRatio changes with zoom, so there are no guarantees that it is the same
			// when destroy is called
			chart.originalDevicePixelRatio = chart.originalDevicePixelRatio || pixelRatio;
		}
	};
	// -- Canvas methods
	helpers.clear = function (chart) {
		chart.ctx.clearRect(0, 0, chart.width, chart.height);
	};
	helpers.fontString = function (pixelSize, fontStyle, fontFamily) {
		return fontStyle + ' ' + pixelSize + 'px ' + fontFamily;
	};
	helpers.longestText = function (ctx, font, arrayOfThings, cache) {
		cache = cache || {};
		var data = cache.data = cache.data || {};
		var gc = cache.garbageCollect = cache.garbageCollect || [];

		if (cache.font !== font) {
			data = cache.data = {};
			gc = cache.garbageCollect = [];
			cache.font = font;
		}

		ctx.font = font; //todo 这里需要添加setFontSize
		var longest = 0;
		helpers.each(arrayOfThings, function (thing) {
			// Undefined strings and arrays should not be measured
			if (thing !== undefined && thing !== null && helpers.isArray(thing) !== true) {
				longest = helpers.measureText(ctx, data, gc, longest, thing);
			} else if (helpers.isArray(thing)) {
				// if it is an array lets measure each element
				// to do maybe simplify this function a bit so we can do this more recursively?
				helpers.each(thing, function (nestedThing) {
					// Undefined strings and arrays should not be measured
					if (nestedThing !== undefined && nestedThing !== null && !helpers.isArray(nestedThing)) {
						longest = helpers.measureText(ctx, data, gc, longest, nestedThing);
					}
				});
			}
		});

		var gcLen = gc.length / 2;
		if (gcLen > arrayOfThings.length) {
			for (var i = 0; i < gcLen; i++) {
				delete data[gc[i]];
			}
			gc.splice(0, gcLen);
		}
		return longest;
	};
	helpers.measureText = function (ctx, data, gc, longest, string) {
		var textWidth = data[string];
		if (!textWidth) {
			textWidth = data[string] = ctx.measureText(string).width;
			gc.push(string);
		}
		if (textWidth > longest) {
			longest = textWidth;
		}
		return longest;
	};
	helpers.numberOfLabelLines = function (arrayOfThings) {
		var numberOfLines = 1;
		helpers.each(arrayOfThings, function (thing) {
			if (helpers.isArray(thing)) {
				if (thing.length > numberOfLines) {
					numberOfLines = thing.length;
				}
			}
		});
		return numberOfLines;
	};
	helpers.drawRoundedRectangle = function (ctx, x, y, width, height, radius) {
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	};
	helpers.color = function (c) {
		if (!color) {
			console.error('Color.js not found!');
			return c;
		}

		// /* global CanvasGradient */
		// if (c instanceof CanvasGradient) {
		// 	return color(Chart.defaults.global.defaultColor);
		// }

		return color(c);
	};
	helpers.addResizeListener = function (node, callback) {
		//禁用事件
		return;
		var iframe = document.createElement('iframe');
		iframe.className = 'chartjs-hidden-iframe';
		iframe.style.cssText = 'display:block;' + 'overflow:hidden;' + 'border:0;' + 'margin:0;' + 'top:0;' + 'left:0;' + 'bottom:0;' + 'right:0;' + 'height:100%;' + 'width:100%;' + 'position:absolute;' + 'pointer-events:none;' + 'z-index:-1;';

		// Prevent the iframe to gain focus on tab.
		// https://github.com/chartjs/Chart.js/issues/3090
		iframe.tabIndex = -1;

		// Let's keep track of this added iframe and thus avoid DOM query when removing it.
		var stub = node._chartjs = {
			resizer: iframe,
			ticking: false
		};

		// Throttle the callback notification until the next animation frame.
		var notify = function notify() {
			if (!stub.ticking) {
				stub.ticking = true;
				helpers.requestAnimFrame.call(window, function () {
					if (stub.resizer) {
						stub.ticking = false;
						return callback();
					}
				});
			}
		};

		// If the iframe is re-attached to the DOM, the resize listener is removed because the
		// content is reloaded, so make sure to install the handler after the iframe is loaded.
		// https://github.com/chartjs/Chart.js/issues/3521
		helpers.addEvent(iframe, 'load', function () {
			helpers.addEvent(iframe.contentWindow || iframe, 'resize', notify);

			// The iframe size might have changed while loading, which can also
			// happen if the size has been changed while detached from the DOM.
			notify();
		});

		node.insertBefore(iframe, node.firstChild);
	};
	helpers.removeResizeListener = function (node) {
		//禁用事件
		return;
		if (!node || !node._chartjs) {
			return;
		}

		var iframe = node._chartjs.resizer;
		if (iframe) {
			iframe.parentNode.removeChild(iframe);
			node._chartjs.resizer = null;
		}

		delete node._chartjs;
	};
	helpers.isArray = Array.isArray ? function (obj) {
		return Array.isArray(obj);
	} : function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]';
	};
	// ! @see http://stackoverflow.com/a/14853974
	helpers.arrayEquals = function (a0, a1) {
		var i, ilen, v0, v1;

		if (!a0 || !a1 || a0.length !== a1.length) {
			return false;
		}

		for (i = 0, ilen = a0.length; i < ilen; ++i) {
			v0 = a0[i];
			v1 = a1[i];

			if (v0 instanceof Array && v1 instanceof Array) {
				if (!helpers.arrayEquals(v0, v1)) {
					return false;
				}
			} else if (v0 !== v1) {
				// NOTE: two different object instances will never be equal: {x:20} != {x:20}
				return false;
			}
		}

		return true;
	};
	helpers.callCallback = function (fn, args, _tArg) {
		if (fn && typeof fn.call === 'function') {
			fn.apply(_tArg, args);
		}
	};
	helpers.getHoverColor = function (colorValue) {
		/* global CanvasPattern */
		return helpers.color(colorValue).saturate(0.5).darken(0.1).rgbString();
	};
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuaGVscGVycy5qcyJdLCJuYW1lcyI6WyJjb2xvciIsInJlcXVpcmUiLCJtb2R1bGUiLCJleHBvcnRzIiwiQ2hhcnQiLCJoZWxwZXJzIiwiZWFjaCIsImxvb3BhYmxlIiwiY2FsbGJhY2siLCJzZWxmIiwicmV2ZXJzZSIsImkiLCJsZW4iLCJpc0FycmF5IiwibGVuZ3RoIiwiY2FsbCIsImtleXMiLCJPYmplY3QiLCJjbG9uZSIsIm9iaiIsIm9iakNsb25lIiwidmFsdWUiLCJrZXkiLCJzbGljZSIsImV4dGVuZCIsImJhc2UiLCJzZXRGbiIsImlsZW4iLCJhcmd1bWVudHMiLCJjb25maWdNZXJnZSIsIl9iYXNlIiwiQXJyYXkiLCJwcm90b3R5cGUiLCJleHRlbnNpb24iLCJiYXNlSGFzUHJvcGVydHkiLCJoYXNPd25Qcm9wZXJ0eSIsImJhc2VWYWwiLCJzY2FsZU1lcmdlIiwic2NhbGVTZXJ2aWNlIiwiZ2V0U2NhbGVEZWZhdWx0cyIsInR5cGUiLCJ2YWx1ZU9iaiIsImluZGV4IiwiYXhpc1R5cGUiLCJnZXRWYWx1ZU9yRGVmYXVsdCIsImF4aXNEZWZhdWx0cyIsInB1c2giLCJnZXRWYWx1ZUF0SW5kZXhPckRlZmF1bHQiLCJkZWZhdWx0VmFsdWUiLCJ1bmRlZmluZWQiLCJpbmRleE9mIiwiYXJyYXkiLCJpdGVtIiwid2hlcmUiLCJjb2xsZWN0aW9uIiwiZmlsdGVyQ2FsbGJhY2siLCJmaWx0ZXIiLCJmaWx0ZXJlZCIsImZpbmRJbmRleCIsInNjb3BlIiwiZmluZE5leHRXaGVyZSIsImFycmF5VG9TZWFyY2giLCJzdGFydEluZGV4IiwiY3VycmVudEl0ZW0iLCJmaW5kUHJldmlvdXNXaGVyZSIsImluaGVyaXRzIiwiZXh0ZW5zaW9ucyIsIm1lIiwiQ2hhcnRFbGVtZW50IiwiY29uc3RydWN0b3IiLCJhcHBseSIsIlN1cnJvZ2F0ZSIsIl9fc3VwZXJfXyIsIm5vb3AiLCJ1aWQiLCJpZCIsImlzTnVtYmVyIiwibiIsImlzTmFOIiwicGFyc2VGbG9hdCIsImlzRmluaXRlIiwiYWxtb3N0RXF1YWxzIiwieCIsInkiLCJlcHNpbG9uIiwiTWF0aCIsImFicyIsIm1heCIsInJlZHVjZSIsIk51bWJlciIsIk5FR0FUSVZFX0lORklOSVRZIiwibWluIiwiUE9TSVRJVkVfSU5GSU5JVFkiLCJzaWduIiwibG9nMTAiLCJsb2ciLCJMTjEwIiwidG9SYWRpYW5zIiwiZGVncmVlcyIsIlBJIiwidG9EZWdyZWVzIiwicmFkaWFucyIsImdldEFuZ2xlRnJvbVBvaW50IiwiY2VudHJlUG9pbnQiLCJhbmdsZVBvaW50IiwiZGlzdGFuY2VGcm9tWENlbnRlciIsImRpc3RhbmNlRnJvbVlDZW50ZXIiLCJyYWRpYWxEaXN0YW5jZUZyb21DZW50ZXIiLCJzcXJ0IiwiYW5nbGUiLCJhdGFuMiIsImRpc3RhbmNlIiwiZGlzdGFuY2VCZXR3ZWVuUG9pbnRzIiwicHQxIiwicHQyIiwicG93IiwiYWxpYXNQaXhlbCIsInBpeGVsV2lkdGgiLCJzcGxpbmVDdXJ2ZSIsImZpcnN0UG9pbnQiLCJtaWRkbGVQb2ludCIsImFmdGVyUG9pbnQiLCJ0IiwicHJldmlvdXMiLCJza2lwIiwiY3VycmVudCIsIm5leHQiLCJkMDEiLCJkMTIiLCJzMDEiLCJzMTIiLCJmYSIsImZiIiwiRVBTSUxPTiIsInNwbGluZUN1cnZlTW9ub3RvbmUiLCJwb2ludHMiLCJwb2ludHNXaXRoVGFuZ2VudHMiLCJtYXAiLCJwb2ludCIsIm1vZGVsIiwiX21vZGVsIiwiZGVsdGFLIiwibUsiLCJwb2ludHNMZW4iLCJwb2ludEJlZm9yZSIsInBvaW50Q3VycmVudCIsInBvaW50QWZ0ZXIiLCJhbHBoYUsiLCJiZXRhSyIsInRhdUsiLCJzcXVhcmVkTWFnbml0dWRlIiwiZGVsdGFYIiwiY29udHJvbFBvaW50UHJldmlvdXNYIiwiY29udHJvbFBvaW50UHJldmlvdXNZIiwiY29udHJvbFBvaW50TmV4dFgiLCJjb250cm9sUG9pbnROZXh0WSIsIm5leHRJdGVtIiwibG9vcCIsInByZXZpb3VzSXRlbSIsIm5pY2VOdW0iLCJyYW5nZSIsInJvdW5kIiwiZXhwb25lbnQiLCJmbG9vciIsImZyYWN0aW9uIiwibmljZUZyYWN0aW9uIiwiZWFzaW5nRWZmZWN0cyIsImxpbmVhciIsImVhc2VJblF1YWQiLCJlYXNlT3V0UXVhZCIsImVhc2VJbk91dFF1YWQiLCJlYXNlSW5DdWJpYyIsImVhc2VPdXRDdWJpYyIsImVhc2VJbk91dEN1YmljIiwiZWFzZUluUXVhcnQiLCJlYXNlT3V0UXVhcnQiLCJlYXNlSW5PdXRRdWFydCIsImVhc2VJblF1aW50IiwiZWFzZU91dFF1aW50IiwiZWFzZUluT3V0UXVpbnQiLCJlYXNlSW5TaW5lIiwiY29zIiwiZWFzZU91dFNpbmUiLCJzaW4iLCJlYXNlSW5PdXRTaW5lIiwiZWFzZUluRXhwbyIsImVhc2VPdXRFeHBvIiwiZWFzZUluT3V0RXhwbyIsImVhc2VJbkNpcmMiLCJlYXNlT3V0Q2lyYyIsImVhc2VJbk91dENpcmMiLCJlYXNlSW5FbGFzdGljIiwicyIsInAiLCJhIiwiYXNpbiIsImVhc2VPdXRFbGFzdGljIiwiZWFzZUluT3V0RWxhc3RpYyIsImVhc2VJbkJhY2siLCJlYXNlT3V0QmFjayIsImVhc2VJbk91dEJhY2siLCJlYXNlSW5Cb3VuY2UiLCJlYXNlT3V0Qm91bmNlIiwiZWFzZUluT3V0Qm91bmNlIiwicmVxdWVzdEFuaW1GcmFtZSIsInNldFRpbWVvdXQiLCJjYW5jZWxBbmltRnJhbWUiLCJjbGVhclRpbWVvdXQiLCJnZXRSZWxhdGl2ZVBvc2l0aW9uIiwiZXZ0IiwiY2hhcnQiLCJtb3VzZVgiLCJtb3VzZVkiLCJlIiwib3JpZ2luYWxFdmVudCIsImNhbnZhcyIsImN1cnJlbnRUYXJnZXQiLCJzcmNFbGVtZW50IiwiYm91bmRpbmdSZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwidG91Y2hlcyIsImNsaWVudFgiLCJjbGllbnRZIiwicGFkZGluZ0xlZnQiLCJnZXRTdHlsZSIsInBhZGRpbmdUb3AiLCJwYWRkaW5nUmlnaHQiLCJwYWRkaW5nQm90dG9tIiwid2lkdGgiLCJyaWdodCIsImxlZnQiLCJoZWlnaHQiLCJib3R0b20iLCJ0b3AiLCJjdXJyZW50RGV2aWNlUGl4ZWxSYXRpbyIsImFkZEV2ZW50Iiwibm9kZSIsImV2ZW50VHlwZSIsIm1ldGhvZCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhdHRhY2hFdmVudCIsInJlbW92ZUV2ZW50IiwiaGFuZGxlciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJkZXRhY2hFdmVudCIsImJpbmRFdmVudHMiLCJjaGFydEluc3RhbmNlIiwiYXJyYXlPZkV2ZW50cyIsImV2ZW50cyIsImV2ZW50TmFtZSIsInVuYmluZEV2ZW50cyIsInBhcnNlTWF4U3R5bGUiLCJzdHlsZVZhbHVlIiwicGFyZW50UHJvcGVydHkiLCJ2YWx1ZUluUGl4ZWxzIiwicGFyc2VJbnQiLCJwYXJlbnROb2RlIiwiaXNDb25zdHJhaW5lZFZhbHVlIiwiZ2V0Q29uc3RyYWludERpbWVuc2lvbiIsImRvbU5vZGUiLCJtYXhTdHlsZSIsInBlcmNlbnRhZ2VQcm9wZXJ0eSIsInZpZXciLCJkb2N1bWVudCIsImRlZmF1bHRWaWV3IiwiY29uc3RyYWluZWROb2RlIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImNvbnN0cmFpbmVkQ29udGFpbmVyIiwiaGFzQ05vZGUiLCJoYXNDQ29udGFpbmVyIiwiaW5maW5pdHkiLCJnZXRDb25zdHJhaW50V2lkdGgiLCJnZXRDb25zdHJhaW50SGVpZ2h0IiwiZ2V0TWF4aW11bVdpZHRoIiwic3R5bGUiLCJjb250YWluZXIiLCJ3IiwiY2xpZW50V2lkdGgiLCJjdyIsImdldE1heGltdW1IZWlnaHQiLCJoIiwiY2xpZW50SGVpZ2h0IiwiY2giLCJlbCIsInByb3BlcnR5IiwiY3VycmVudFN0eWxlIiwiZ2V0UHJvcGVydHlWYWx1ZSIsInJldGluYVNjYWxlIiwiY3R4IiwicGl4ZWxSYXRpbyIsImRldmljZVBpeGVsUmF0aW8iLCJzY2FsZSIsIm9yaWdpbmFsRGV2aWNlUGl4ZWxSYXRpbyIsImNsZWFyIiwiY2xlYXJSZWN0IiwiZm9udFN0cmluZyIsInBpeGVsU2l6ZSIsImZvbnRTdHlsZSIsImZvbnRGYW1pbHkiLCJsb25nZXN0VGV4dCIsImZvbnQiLCJhcnJheU9mVGhpbmdzIiwiY2FjaGUiLCJkYXRhIiwiZ2MiLCJnYXJiYWdlQ29sbGVjdCIsImxvbmdlc3QiLCJ0aGluZyIsIm1lYXN1cmVUZXh0IiwibmVzdGVkVGhpbmciLCJnY0xlbiIsInNwbGljZSIsInN0cmluZyIsInRleHRXaWR0aCIsIm51bWJlck9mTGFiZWxMaW5lcyIsIm51bWJlck9mTGluZXMiLCJkcmF3Um91bmRlZFJlY3RhbmdsZSIsInJhZGl1cyIsImJlZ2luUGF0aCIsIm1vdmVUbyIsImxpbmVUbyIsInF1YWRyYXRpY0N1cnZlVG8iLCJjbG9zZVBhdGgiLCJjIiwiY29uc29sZSIsImVycm9yIiwiYWRkUmVzaXplTGlzdGVuZXIiLCJpZnJhbWUiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NOYW1lIiwiY3NzVGV4dCIsInRhYkluZGV4Iiwic3R1YiIsIl9jaGFydGpzIiwicmVzaXplciIsInRpY2tpbmciLCJub3RpZnkiLCJ3aW5kb3ciLCJjb250ZW50V2luZG93IiwiaW5zZXJ0QmVmb3JlIiwiZmlyc3RDaGlsZCIsInJlbW92ZVJlc2l6ZUxpc3RlbmVyIiwicmVtb3ZlQ2hpbGQiLCJ0b1N0cmluZyIsImFycmF5RXF1YWxzIiwiYTAiLCJhMSIsInYwIiwidjEiLCJjYWxsQ2FsbGJhY2siLCJmbiIsImFyZ3MiLCJfdEFyZyIsImdldEhvdmVyQ29sb3IiLCJjb2xvclZhbHVlIiwic2F0dXJhdGUiLCJkYXJrZW4iLCJyZ2JTdHJpbmciXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTs7OztBQUVBLElBQUlBLFFBQVFDLFFBQVEsNkJBQVIsQ0FBWjs7QUFFQUMsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxLQUFULEVBQWdCO0FBQ2hDO0FBQ0EsS0FBSUMsVUFBVUQsTUFBTUMsT0FBTixHQUFnQixFQUE5Qjs7QUFFQTtBQUNBQSxTQUFRQyxJQUFSLEdBQWUsVUFBU0MsUUFBVCxFQUFtQkMsUUFBbkIsRUFBNkJD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QUFHOVUsQ0FBSCxDQUFMO0FBQ0FpVixRQUFLRixHQUFHL1UsQ0FBSCxDQUFMOztBQUVBLE9BQUlnVixjQUFjNVQsS0FBZCxJQUF1QjZULGNBQWM3VCxLQUF6QyxFQUFnRDtBQUMvQyxRQUFJLENBQUMxQixRQUFRbVYsV0FBUixDQUFvQkcsRUFBcEIsRUFBd0JDLEVBQXhCLENBQUwsRUFBa0M7QUFDakMsWUFBTyxLQUFQO0FBQ0E7QUFDRCxJQUpELE1BSU8sSUFBSUQsT0FBT0MsRUFBWCxFQUFlO0FBQ3JCO0FBQ0EsV0FBTyxLQUFQO0FBQ0E7QUFDRDs7QUFFRCxTQUFPLElBQVA7QUFDQSxFQXRCRDtBQXVCQXZWLFNBQVF3VixZQUFSLEdBQXVCLFVBQVNDLEVBQVQsRUFBYUMsSUFBYixFQUFtQkMsS0FBbkIsRUFBMEI7QUFDaEQsTUFBSUYsTUFBTSxPQUFPQSxHQUFHL1UsSUFBVixLQUFtQixVQUE3QixFQUF5QztBQUN4QytVLE1BQUd4UixLQUFILENBQVMwUixLQUFULEVBQWdCRCxJQUFoQjtBQUNBO0FBQ0QsRUFKRDtBQUtBMVYsU0FBUTRWLGFBQVIsR0FBd0IsVUFBU0MsVUFBVCxFQUFxQjtBQUM1QztBQUNBLFNBQU83VixRQUFRTCxLQUFSLENBQWNrVyxVQUFkLEVBQTBCQyxRQUExQixDQUFtQyxHQUFuQyxFQUF3Q0MsTUFBeEMsQ0FBK0MsR0FBL0MsRUFBb0RDLFNBQXBELEVBQVA7QUFDQSxFQUhEO0FBSUEsQ0EvZ0NEIiwiZmlsZSI6ImNvcmUuaGVscGVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXHJcbi8qIGdsb2JhbCBkb2N1bWVudDogZmFsc2UgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGNvbG9yID0gcmVxdWlyZSgnLi4vbm9kZU1vZHVsZS9jaGFydGpzLWNvbG9yJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENoYXJ0KSB7XHJcblx0Ly8gR2xvYmFsIENoYXJ0IGhlbHBlcnMgb2JqZWN0IGZvciB1dGlsaXR5IG1ldGhvZHMgYW5kIGNsYXNzZXNcclxuXHR2YXIgaGVscGVycyA9IENoYXJ0LmhlbHBlcnMgPSB7fTtcclxuXHJcblx0Ly8gLS0gQmFzaWMganMgdXRpbGl0eSBtZXRob2RzXHJcblx0aGVscGVycy5lYWNoID0gZnVuY3Rpb24obG9vcGFibGUsIGNhbGxiYWNrLCBzZWxmLCByZXZlcnNlKSB7XHJcblx0XHQvLyBDaGVjayB0byBzZWUgaWYgbnVsbCBvciB1bmRlZmluZWQgZmlyc3RseS5cclxuXHRcdHZhciBpLCBsZW47XHJcblx0XHRpZiAoaGVscGVycy5pc0FycmF5KGxvb3BhYmxlKSkge1xyXG5cdFx0XHRsZW4gPSBsb29wYWJsZS5sZW5ndGg7XHJcblx0XHRcdGlmIChyZXZlcnNlKSB7XHJcblx0XHRcdFx0Zm9yIChpID0gbGVuIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuXHRcdFx0XHRcdGNhbGxiYWNrLmNhbGwoc2VsZiwgbG9vcGFibGVbaV0sIGkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuXHRcdFx0XHRcdGNhbGxiYWNrLmNhbGwoc2VsZiwgbG9vcGFibGVbaV0sIGkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgbG9vcGFibGUgPT09ICdvYmplY3QnKSB7XHJcblx0XHRcdHZhciBrZXlzID0gT2JqZWN0LmtleXMobG9vcGFibGUpO1xyXG5cdFx0XHRsZW4gPSBrZXlzLmxlbmd0aDtcclxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XHJcblx0XHRcdFx0Y2FsbGJhY2suY2FsbChzZWxmLCBsb29wYWJsZVtrZXlzW2ldXSwga2V5c1tpXSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cdGhlbHBlcnMuY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcclxuXHRcdHZhciBvYmpDbG9uZSA9IHt9O1xyXG5cdFx0aGVscGVycy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xyXG5cdFx0XHRpZiAoaGVscGVycy5pc0FycmF5KHZhbHVlKSkge1xyXG5cdFx0XHRcdG9iakNsb25lW2tleV0gPSB2YWx1ZS5zbGljZSgwKTtcclxuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XHJcblx0XHRcdFx0b2JqQ2xvbmVba2V5XSA9IGhlbHBlcnMuY2xvbmUodmFsdWUpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdG9iakNsb25lW2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm4gb2JqQ2xvbmU7XHJcblx0fTtcclxuXHRoZWxwZXJzLmV4dGVuZCA9IGZ1bmN0aW9uKGJhc2UpIHtcclxuXHRcdHZhciBzZXRGbiA9IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcclxuXHRcdFx0YmFzZVtrZXldID0gdmFsdWU7XHJcblx0XHR9O1xyXG5cdFx0Zm9yICh2YXIgaSA9IDEsIGlsZW4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWxlbjsgaSsrKSB7XHJcblx0XHRcdGhlbHBlcnMuZWFjaChhcmd1bWVudHNbaV0sIHNldEZuKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBiYXNlO1xyXG5cdH07XHJcblx0Ly8gTmVlZCBhIHNwZWNpYWwgbWVyZ2UgZnVuY3Rpb24gdG8gY2hhcnQgY29uZmlncyBzaW5jZSB0aGV5IGFyZSBub3cgZ3JvdXBlZFxyXG5cdGhlbHBlcnMuY29uZmlnTWVyZ2UgPSBmdW5jdGlvbihfYmFzZSkge1xyXG5cdFx0dmFyIGJhc2UgPSBoZWxwZXJzLmNsb25lKF9iYXNlKTtcclxuXHRcdGhlbHBlcnMuZWFjaChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihleHRlbnNpb24pIHtcclxuXHRcdFx0aGVscGVycy5lYWNoKGV4dGVuc2lvbiwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xyXG5cdFx0XHRcdHZhciBiYXNlSGFzUHJvcGVydHkgPSBiYXNlLmhhc093blByb3BlcnR5KGtleSk7XHJcblx0XHRcdFx0dmFyIGJhc2VWYWwgPSBiYXNlSGFzUHJvcGVydHkgPyBiYXNlW2tleV0gOiB7fTtcclxuXHJcblx0XHRcdFx0aWYgKGtleSA9PT0gJ3NjYWxlcycpIHtcclxuXHRcdFx0XHRcdC8vIFNjYWxlIGNvbmZpZyBtZXJnaW5nIGlzIGNvbXBsZXguIEFkZCBvdXIgb3duIGZ1bmN0aW9uIGhlcmUgZm9yIHRoYXRcclxuXHRcdFx0XHRcdGJhc2Vba2V5XSA9IGhlbHBlcnMuc2NhbGVNZXJnZShiYXNlVmFsLCB2YWx1ZSk7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT09ICdzY2FsZScpIHtcclxuXHRcdFx0XHRcdC8vIFVzZWQgaW4gcG9sYXIgYXJlYSAmIHJhZGFyIGNoYXJ0cyBzaW5jZSB0aGVyZSBpcyBvbmx5IG9uZSBzY2FsZVxyXG5cdFx0XHRcdFx0YmFzZVtrZXldID0gaGVscGVycy5jb25maWdNZXJnZShiYXNlVmFsLCBDaGFydC5zY2FsZVNlcnZpY2UuZ2V0U2NhbGVEZWZhdWx0cyh2YWx1ZS50eXBlKSwgdmFsdWUpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoYmFzZUhhc1Byb3BlcnR5XHJcblx0XHRcdFx0XHRcdCYmIHR5cGVvZiBiYXNlVmFsID09PSAnb2JqZWN0J1xyXG5cdFx0XHRcdFx0XHQmJiAhaGVscGVycy5pc0FycmF5KGJhc2VWYWwpXHJcblx0XHRcdFx0XHRcdCYmIGJhc2VWYWwgIT09IG51bGxcclxuXHRcdFx0XHRcdFx0JiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0J1xyXG5cdFx0XHRcdFx0XHQmJiAhaGVscGVycy5pc0FycmF5KHZhbHVlKSkge1xyXG5cdFx0XHRcdFx0Ly8gSWYgd2UgYXJlIG92ZXJ3cml0aW5nIGFuIG9iamVjdCB3aXRoIGFuIG9iamVjdCwgZG8gYSBtZXJnZSBvZiB0aGUgcHJvcGVydGllcy5cclxuXHRcdFx0XHRcdGJhc2Vba2V5XSA9IGhlbHBlcnMuY29uZmlnTWVyZ2UoYmFzZVZhbCwgdmFsdWUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBjYW4ganVzdCBvdmVyd3JpdGUgdGhlIHZhbHVlIGluIHRoaXMgY2FzZVxyXG5cdFx0XHRcdFx0YmFzZVtrZXldID0gdmFsdWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBiYXNlO1xyXG5cdH07XHJcblx0aGVscGVycy5zY2FsZU1lcmdlID0gZnVuY3Rpb24oX2Jhc2UsIGV4dGVuc2lvbikge1xyXG5cdFx0dmFyIGJhc2UgPSBoZWxwZXJzLmNsb25lKF9iYXNlKTtcclxuXHJcblx0XHRoZWxwZXJzLmVhY2goZXh0ZW5zaW9uLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XHJcblx0XHRcdGlmIChrZXkgPT09ICd4QXhlcycgfHwga2V5ID09PSAneUF4ZXMnKSB7XHJcblx0XHRcdFx0Ly8gVGhlc2UgcHJvcGVydGllcyBhcmUgYXJyYXlzIG9mIGl0ZW1zXHJcblx0XHRcdFx0aWYgKGJhc2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRcdFx0aGVscGVycy5lYWNoKHZhbHVlLCBmdW5jdGlvbih2YWx1ZU9iaiwgaW5kZXgpIHtcclxuXHRcdFx0XHRcdFx0dmFyIGF4aXNUeXBlID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdCh2YWx1ZU9iai50eXBlLCBrZXkgPT09ICd4QXhlcycgPyAnY2F0ZWdvcnknIDogJ2xpbmVhcicpO1xyXG5cdFx0XHRcdFx0XHR2YXIgYXhpc0RlZmF1bHRzID0gQ2hhcnQuc2NhbGVTZXJ2aWNlLmdldFNjYWxlRGVmYXVsdHMoYXhpc1R5cGUpO1xyXG5cdFx0XHRcdFx0XHRpZiAoaW5kZXggPj0gYmFzZVtrZXldLmxlbmd0aCB8fCAhYmFzZVtrZXldW2luZGV4XS50eXBlKSB7XHJcblx0XHRcdFx0XHRcdFx0YmFzZVtrZXldLnB1c2goaGVscGVycy5jb25maWdNZXJnZShheGlzRGVmYXVsdHMsIHZhbHVlT2JqKSk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodmFsdWVPYmoudHlwZSAmJiB2YWx1ZU9iai50eXBlICE9PSBiYXNlW2tleV1baW5kZXhdLnR5cGUpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBUeXBlIGNoYW5nZWQuIEJyaW5nIGluIHRoZSBuZXcgZGVmYXVsdHMgYmVmb3JlIHdlIGJyaW5nIGluIHZhbHVlT2JqIHNvIHRoYXQgdmFsdWVPYmogY2FuIG92ZXJyaWRlIHRoZSBjb3JyZWN0IHNjYWxlIGRlZmF1bHRzXHJcblx0XHRcdFx0XHRcdFx0YmFzZVtrZXldW2luZGV4XSA9IGhlbHBlcnMuY29uZmlnTWVyZ2UoYmFzZVtrZXldW2luZGV4XSwgYXhpc0RlZmF1bHRzLCB2YWx1ZU9iaik7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gVHlwZSBpcyB0aGUgc2FtZVxyXG5cdFx0XHRcdFx0XHRcdGJhc2Vba2V5XVtpbmRleF0gPSBoZWxwZXJzLmNvbmZpZ01lcmdlKGJhc2Vba2V5XVtpbmRleF0sIHZhbHVlT2JqKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGJhc2Vba2V5XSA9IFtdO1xyXG5cdFx0XHRcdFx0aGVscGVycy5lYWNoKHZhbHVlLCBmdW5jdGlvbih2YWx1ZU9iaikge1xyXG5cdFx0XHRcdFx0XHR2YXIgYXhpc1R5cGUgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KHZhbHVlT2JqLnR5cGUsIGtleSA9PT0gJ3hBeGVzJyA/ICdjYXRlZ29yeScgOiAnbGluZWFyJyk7XHJcblx0XHRcdFx0XHRcdGJhc2Vba2V5XS5wdXNoKGhlbHBlcnMuY29uZmlnTWVyZ2UoQ2hhcnQuc2NhbGVTZXJ2aWNlLmdldFNjYWxlRGVmYXVsdHMoYXhpc1R5cGUpLCB2YWx1ZU9iaikpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2UuaGFzT3duUHJvcGVydHkoa2V5KSAmJiB0eXBlb2YgYmFzZVtrZXldID09PSAnb2JqZWN0JyAmJiBiYXNlW2tleV0gIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xyXG5cdFx0XHRcdC8vIElmIHdlIGFyZSBvdmVyd3JpdGluZyBhbiBvYmplY3Qgd2l0aCBhbiBvYmplY3QsIGRvIGEgbWVyZ2Ugb2YgdGhlIHByb3BlcnRpZXMuXHJcblx0XHRcdFx0YmFzZVtrZXldID0gaGVscGVycy5jb25maWdNZXJnZShiYXNlW2tleV0sIHZhbHVlKTtcclxuXHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gY2FuIGp1c3Qgb3ZlcndyaXRlIHRoZSB2YWx1ZSBpbiB0aGlzIGNhc2VcclxuXHRcdFx0XHRiYXNlW2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGJhc2U7XHJcblx0fTtcclxuXHRoZWxwZXJzLmdldFZhbHVlQXRJbmRleE9yRGVmYXVsdCA9IGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgZGVmYXVsdFZhbHVlKSB7XHJcblx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xyXG5cdFx0XHRyZXR1cm4gZGVmYXVsdFZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChoZWxwZXJzLmlzQXJyYXkodmFsdWUpKSB7XHJcblx0XHRcdHJldHVybiBpbmRleCA8IHZhbHVlLmxlbmd0aCA/IHZhbHVlW2luZGV4XSA6IGRlZmF1bHRWYWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdmFsdWU7XHJcblx0fTtcclxuXHRoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0ID0gZnVuY3Rpb24odmFsdWUsIGRlZmF1bHRWYWx1ZSkge1xyXG5cdFx0cmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWQgPyBkZWZhdWx0VmFsdWUgOiB2YWx1ZTtcclxuXHR9O1xyXG5cdGhlbHBlcnMuaW5kZXhPZiA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mP1xyXG5cdFx0ZnVuY3Rpb24oYXJyYXksIGl0ZW0pIHtcclxuXHRcdFx0cmV0dXJuIGFycmF5LmluZGV4T2YoaXRlbSk7XHJcblx0XHR9OlxyXG5cdFx0ZnVuY3Rpb24oYXJyYXksIGl0ZW0pIHtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGlsZW4gPSBhcnJheS5sZW5ndGg7IGkgPCBpbGVuOyArK2kpIHtcclxuXHRcdFx0XHRpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHtcclxuXHRcdFx0XHRcdHJldHVybiBpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gLTE7XHJcblx0XHR9O1xyXG5cdGhlbHBlcnMud2hlcmUgPSBmdW5jdGlvbihjb2xsZWN0aW9uLCBmaWx0ZXJDYWxsYmFjaykge1xyXG5cdFx0aWYgKGhlbHBlcnMuaXNBcnJheShjb2xsZWN0aW9uKSAmJiBBcnJheS5wcm90b3R5cGUuZmlsdGVyKSB7XHJcblx0XHRcdHJldHVybiBjb2xsZWN0aW9uLmZpbHRlcihmaWx0ZXJDYWxsYmFjayk7XHJcblx0XHR9XHJcblx0XHR2YXIgZmlsdGVyZWQgPSBbXTtcclxuXHJcblx0XHRoZWxwZXJzLmVhY2goY29sbGVjdGlvbiwgZnVuY3Rpb24oaXRlbSkge1xyXG5cdFx0XHRpZiAoZmlsdGVyQ2FsbGJhY2soaXRlbSkpIHtcclxuXHRcdFx0XHRmaWx0ZXJlZC5wdXNoKGl0ZW0pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gZmlsdGVyZWQ7XHJcblx0fTtcclxuXHRoZWxwZXJzLmZpbmRJbmRleCA9IEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXg/XHJcblx0XHRmdW5jdGlvbihhcnJheSwgY2FsbGJhY2ssIHNjb3BlKSB7XHJcblx0XHRcdHJldHVybiBhcnJheS5maW5kSW5kZXgoY2FsbGJhY2ssIHNjb3BlKTtcclxuXHRcdH0gOlxyXG5cdFx0ZnVuY3Rpb24oYXJyYXksIGNhbGxiYWNrLCBzY29wZSkge1xyXG5cdFx0XHRzY29wZSA9IHNjb3BlID09PSB1bmRlZmluZWQ/IGFycmF5IDogc2NvcGU7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwLCBpbGVuID0gYXJyYXkubGVuZ3RoOyBpIDwgaWxlbjsgKytpKSB7XHJcblx0XHRcdFx0aWYgKGNhbGxiYWNrLmNhbGwoc2NvcGUsIGFycmF5W2ldLCBpLCBhcnJheSkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gLTE7XHJcblx0XHR9O1xyXG5cdGhlbHBlcnMuZmluZE5leHRXaGVyZSA9IGZ1bmN0aW9uKGFycmF5VG9TZWFyY2gsIGZpbHRlckNhbGxiYWNrLCBzdGFydEluZGV4KSB7XHJcblx0XHQvLyBEZWZhdWx0IHRvIHN0YXJ0IG9mIHRoZSBhcnJheVxyXG5cdFx0aWYgKHN0YXJ0SW5kZXggPT09IHVuZGVmaW5lZCB8fCBzdGFydEluZGV4ID09PSBudWxsKSB7XHJcblx0XHRcdHN0YXJ0SW5kZXggPSAtMTtcclxuXHRcdH1cclxuXHRcdGZvciAodmFyIGkgPSBzdGFydEluZGV4ICsgMTsgaSA8IGFycmF5VG9TZWFyY2gubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIGN1cnJlbnRJdGVtID0gYXJyYXlUb1NlYXJjaFtpXTtcclxuXHRcdFx0aWYgKGZpbHRlckNhbGxiYWNrKGN1cnJlbnRJdGVtKSkge1xyXG5cdFx0XHRcdHJldHVybiBjdXJyZW50SXRlbTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblx0aGVscGVycy5maW5kUHJldmlvdXNXaGVyZSA9IGZ1bmN0aW9uKGFycmF5VG9TZWFyY2gsIGZpbHRlckNhbGxiYWNrLCBzdGFydEluZGV4KSB7XHJcblx0XHQvLyBEZWZhdWx0IHRvIGVuZCBvZiB0aGUgYXJyYXlcclxuXHRcdGlmIChzdGFydEluZGV4ID09PSB1bmRlZmluZWQgfHwgc3RhcnRJbmRleCA9PT0gbnVsbCkge1xyXG5cdFx0XHRzdGFydEluZGV4ID0gYXJyYXlUb1NlYXJjaC5sZW5ndGg7XHJcblx0XHR9XHJcblx0XHRmb3IgKHZhciBpID0gc3RhcnRJbmRleCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRcdHZhciBjdXJyZW50SXRlbSA9IGFycmF5VG9TZWFyY2hbaV07XHJcblx0XHRcdGlmIChmaWx0ZXJDYWxsYmFjayhjdXJyZW50SXRlbSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gY3VycmVudEl0ZW07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cdGhlbHBlcnMuaW5oZXJpdHMgPSBmdW5jdGlvbihleHRlbnNpb25zKSB7XHJcblx0XHQvLyBCYXNpYyBqYXZhc2NyaXB0IGluaGVyaXRhbmNlIGJhc2VkIG9uIHRoZSBtb2RlbCBjcmVhdGVkIGluIEJhY2tib25lLmpzXHJcblx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0dmFyIENoYXJ0RWxlbWVudCA9IChleHRlbnNpb25zICYmIGV4dGVuc2lvbnMuaGFzT3duUHJvcGVydHkoJ2NvbnN0cnVjdG9yJykpID8gZXh0ZW5zaW9ucy5jb25zdHJ1Y3RvciA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gbWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHRcdH07XHJcblxyXG5cdFx0dmFyIFN1cnJvZ2F0ZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLmNvbnN0cnVjdG9yID0gQ2hhcnRFbGVtZW50O1xyXG5cdFx0fTtcclxuXHRcdFN1cnJvZ2F0ZS5wcm90b3R5cGUgPSBtZS5wcm90b3R5cGU7XHJcblx0XHRDaGFydEVsZW1lbnQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZSgpO1xyXG5cclxuXHRcdENoYXJ0RWxlbWVudC5leHRlbmQgPSBoZWxwZXJzLmluaGVyaXRzO1xyXG5cclxuXHRcdGlmIChleHRlbnNpb25zKSB7XHJcblx0XHRcdGhlbHBlcnMuZXh0ZW5kKENoYXJ0RWxlbWVudC5wcm90b3R5cGUsIGV4dGVuc2lvbnMpO1xyXG5cdFx0fVxyXG5cclxuXHRcdENoYXJ0RWxlbWVudC5fX3N1cGVyX18gPSBtZS5wcm90b3R5cGU7XHJcblxyXG5cdFx0cmV0dXJuIENoYXJ0RWxlbWVudDtcclxuXHR9O1xyXG5cdGhlbHBlcnMubm9vcCA9IGZ1bmN0aW9uKCkge307XHJcblx0aGVscGVycy51aWQgPSAoZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgaWQgPSAwO1xyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gaWQrKztcclxuXHRcdH07XHJcblx0fSgpKTtcclxuXHQvLyAtLSBNYXRoIG1ldGhvZHNcclxuXHRoZWxwZXJzLmlzTnVtYmVyID0gZnVuY3Rpb24obikge1xyXG5cdFx0cmV0dXJuICFpc05hTihwYXJzZUZsb2F0KG4pKSAmJiBpc0Zpbml0ZShuKTtcclxuXHR9O1xyXG5cdGhlbHBlcnMuYWxtb3N0RXF1YWxzID0gZnVuY3Rpb24oeCwgeSwgZXBzaWxvbikge1xyXG5cdFx0cmV0dXJuIE1hdGguYWJzKHggLSB5KSA8IGVwc2lsb247XHJcblx0fTtcclxuXHRoZWxwZXJzLm1heCA9IGZ1bmN0aW9uKGFycmF5KSB7XHJcblx0XHRyZXR1cm4gYXJyYXkucmVkdWNlKGZ1bmN0aW9uKG1heCwgdmFsdWUpIHtcclxuXHRcdFx0aWYgKCFpc05hTih2YWx1ZSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gTWF0aC5tYXgobWF4LCB2YWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIG1heDtcclxuXHRcdH0sIE51bWJlci5ORUdBVElWRV9JTkZJTklUWSk7XHJcblx0fTtcclxuXHRoZWxwZXJzLm1pbiA9IGZ1bmN0aW9uKGFycmF5KSB7XHJcblx0XHRyZXR1cm4gYXJyYXkucmVkdWNlKGZ1bmN0aW9uKG1pbiwgdmFsdWUpIHtcclxuXHRcdFx0aWYgKCFpc05hTih2YWx1ZSkpIHtcclxuXHRcdFx0XHRyZXR1cm4gTWF0aC5taW4obWluLCB2YWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIG1pbjtcclxuXHRcdH0sIE51bWJlci5QT1NJVElWRV9JTkZJTklUWSk7XHJcblx0fTtcclxuXHRoZWxwZXJzLnNpZ24gPSBNYXRoLnNpZ24/XHJcblx0XHRmdW5jdGlvbih4KSB7XHJcblx0XHRcdHJldHVybiBNYXRoLnNpZ24oeCk7XHJcblx0XHR9IDpcclxuXHRcdGZ1bmN0aW9uKHgpIHtcclxuXHRcdFx0eCA9ICt4OyAvLyBjb252ZXJ0IHRvIGEgbnVtYmVyXHJcblx0XHRcdGlmICh4ID09PSAwIHx8IGlzTmFOKHgpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHg7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHggPiAwID8gMSA6IC0xO1xyXG5cdFx0fTtcclxuXHRoZWxwZXJzLmxvZzEwID0gTWF0aC5sb2cxMD9cclxuXHRcdGZ1bmN0aW9uKHgpIHtcclxuXHRcdFx0cmV0dXJuIE1hdGgubG9nMTAoeCk7XHJcblx0XHR9IDpcclxuXHRcdGZ1bmN0aW9uKHgpIHtcclxuXHRcdFx0cmV0dXJuIE1hdGgubG9nKHgpIC8gTWF0aC5MTjEwO1xyXG5cdFx0fTtcclxuXHRoZWxwZXJzLnRvUmFkaWFucyA9IGZ1bmN0aW9uKGRlZ3JlZXMpIHtcclxuXHRcdHJldHVybiBkZWdyZWVzICogKE1hdGguUEkgLyAxODApO1xyXG5cdH07XHJcblx0aGVscGVycy50b0RlZ3JlZXMgPSBmdW5jdGlvbihyYWRpYW5zKSB7XHJcblx0XHRyZXR1cm4gcmFkaWFucyAqICgxODAgLyBNYXRoLlBJKTtcclxuXHR9O1xyXG5cdC8vIEdldHMgdGhlIGFuZ2xlIGZyb20gdmVydGljYWwgdXByaWdodCB0byB0aGUgcG9pbnQgYWJvdXQgYSBjZW50cmUuXHJcblx0aGVscGVycy5nZXRBbmdsZUZyb21Qb2ludCA9IGZ1bmN0aW9uKGNlbnRyZVBvaW50LCBhbmdsZVBvaW50KSB7XHJcblx0XHR2YXIgZGlzdGFuY2VGcm9tWENlbnRlciA9IGFuZ2xlUG9pbnQueCAtIGNlbnRyZVBvaW50LngsXHJcblx0XHRcdGRpc3RhbmNlRnJvbVlDZW50ZXIgPSBhbmdsZVBvaW50LnkgLSBjZW50cmVQb2ludC55LFxyXG5cdFx0XHRyYWRpYWxEaXN0YW5jZUZyb21DZW50ZXIgPSBNYXRoLnNxcnQoZGlzdGFuY2VGcm9tWENlbnRlciAqIGRpc3RhbmNlRnJvbVhDZW50ZXIgKyBkaXN0YW5jZUZyb21ZQ2VudGVyICogZGlzdGFuY2VGcm9tWUNlbnRlcik7XHJcblxyXG5cdFx0dmFyIGFuZ2xlID0gTWF0aC5hdGFuMihkaXN0YW5jZUZyb21ZQ2VudGVyLCBkaXN0YW5jZUZyb21YQ2VudGVyKTtcclxuXHJcblx0XHRpZiAoYW5nbGUgPCAoLTAuNSAqIE1hdGguUEkpKSB7XHJcblx0XHRcdGFuZ2xlICs9IDIuMCAqIE1hdGguUEk7IC8vIG1ha2Ugc3VyZSB0aGUgcmV0dXJuZWQgYW5nbGUgaXMgaW4gdGhlIHJhbmdlIG9mICgtUEkvMiwgM1BJLzJdXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0YW5nbGU6IGFuZ2xlLFxyXG5cdFx0XHRkaXN0YW5jZTogcmFkaWFsRGlzdGFuY2VGcm9tQ2VudGVyXHJcblx0XHR9O1xyXG5cdH07XHJcblx0aGVscGVycy5kaXN0YW5jZUJldHdlZW5Qb2ludHMgPSBmdW5jdGlvbihwdDEsIHB0Mikge1xyXG5cdFx0cmV0dXJuIE1hdGguc3FydChNYXRoLnBvdyhwdDIueCAtIHB0MS54LCAyKSArIE1hdGgucG93KHB0Mi55IC0gcHQxLnksIDIpKTtcclxuXHR9O1xyXG5cdGhlbHBlcnMuYWxpYXNQaXhlbCA9IGZ1bmN0aW9uKHBpeGVsV2lkdGgpIHtcclxuXHRcdHJldHVybiAocGl4ZWxXaWR0aCAlIDIgPT09IDApID8gMCA6IDAuNTtcclxuXHR9O1xyXG5cdGhlbHBlcnMuc3BsaW5lQ3VydmUgPSBmdW5jdGlvbihmaXJzdFBvaW50LCBtaWRkbGVQb2ludCwgYWZ0ZXJQb2ludCwgdCkge1xyXG5cdFx0Ly8gUHJvcHMgdG8gUm9iIFNwZW5jZXIgYXQgc2NhbGVkIGlubm92YXRpb24gZm9yIGhpcyBwb3N0IG9uIHNwbGluaW5nIGJldHdlZW4gcG9pbnRzXHJcblx0XHQvLyBodHRwOi8vc2NhbGVkaW5ub3ZhdGlvbi5jb20vYW5hbHl0aWNzL3NwbGluZXMvYWJvdXRTcGxpbmVzLmh0bWxcclxuXHJcblx0XHQvLyBUaGlzIGZ1bmN0aW9uIG11c3QgYWxzbyByZXNwZWN0IFwic2tpcHBlZFwiIHBvaW50c1xyXG5cclxuXHRcdHZhciBwcmV2aW91cyA9IGZpcnN0UG9pbnQuc2tpcCA/IG1pZGRsZVBvaW50IDogZmlyc3RQb2ludCxcclxuXHRcdFx0Y3VycmVudCA9IG1pZGRsZVBvaW50LFxyXG5cdFx0XHRuZXh0ID0gYWZ0ZXJQb2ludC5za2lwID8gbWlkZGxlUG9pbnQgOiBhZnRlclBvaW50O1xyXG5cclxuXHRcdHZhciBkMDEgPSBNYXRoLnNxcnQoTWF0aC5wb3coY3VycmVudC54IC0gcHJldmlvdXMueCwgMikgKyBNYXRoLnBvdyhjdXJyZW50LnkgLSBwcmV2aW91cy55LCAyKSk7XHJcblx0XHR2YXIgZDEyID0gTWF0aC5zcXJ0KE1hdGgucG93KG5leHQueCAtIGN1cnJlbnQueCwgMikgKyBNYXRoLnBvdyhuZXh0LnkgLSBjdXJyZW50LnksIDIpKTtcclxuXHJcblx0XHR2YXIgczAxID0gZDAxIC8gKGQwMSArIGQxMik7XHJcblx0XHR2YXIgczEyID0gZDEyIC8gKGQwMSArIGQxMik7XHJcblxyXG5cdFx0Ly8gSWYgYWxsIHBvaW50cyBhcmUgdGhlIHNhbWUsIHMwMSAmIHMwMiB3aWxsIGJlIGluZlxyXG5cdFx0czAxID0gaXNOYU4oczAxKSA/IDAgOiBzMDE7XHJcblx0XHRzMTIgPSBpc05hTihzMTIpID8gMCA6IHMxMjtcclxuXHJcblx0XHR2YXIgZmEgPSB0ICogczAxOyAvLyBzY2FsaW5nIGZhY3RvciBmb3IgdHJpYW5nbGUgVGFcclxuXHRcdHZhciBmYiA9IHQgKiBzMTI7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0cHJldmlvdXM6IHtcclxuXHRcdFx0XHR4OiBjdXJyZW50LnggLSBmYSAqIChuZXh0LnggLSBwcmV2aW91cy54KSxcclxuXHRcdFx0XHR5OiBjdXJyZW50LnkgLSBmYSAqIChuZXh0LnkgLSBwcmV2aW91cy55KVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRuZXh0OiB7XHJcblx0XHRcdFx0eDogY3VycmVudC54ICsgZmIgKiAobmV4dC54IC0gcHJldmlvdXMueCksXHJcblx0XHRcdFx0eTogY3VycmVudC55ICsgZmIgKiAobmV4dC55IC0gcHJldmlvdXMueSlcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9O1xyXG5cdGhlbHBlcnMuRVBTSUxPTiA9IE51bWJlci5FUFNJTE9OIHx8IDFlLTE0O1xyXG5cdGhlbHBlcnMuc3BsaW5lQ3VydmVNb25vdG9uZSA9IGZ1bmN0aW9uKHBvaW50cykge1xyXG5cdFx0Ly8gVGhpcyBmdW5jdGlvbiBjYWxjdWxhdGVzIELDqXppZXIgY29udHJvbCBwb2ludHMgaW4gYSBzaW1pbGFyIHdheSB0aGFuIHxzcGxpbmVDdXJ2ZXwsXHJcblx0XHQvLyBidXQgcHJlc2VydmVzIG1vbm90b25pY2l0eSBvZiB0aGUgcHJvdmlkZWQgZGF0YSBhbmQgZW5zdXJlcyBubyBsb2NhbCBleHRyZW11bXMgYXJlIGFkZGVkXHJcblx0XHQvLyBiZXR3ZWVuIHRoZSBkYXRhc2V0IGRpc2NyZXRlIHBvaW50cyBkdWUgdG8gdGhlIGludGVycG9sYXRpb24uXHJcblx0XHQvLyBTZWUgOiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Nb25vdG9uZV9jdWJpY19pbnRlcnBvbGF0aW9uXHJcblxyXG5cdFx0dmFyIHBvaW50c1dpdGhUYW5nZW50cyA9IChwb2ludHMgfHwgW10pLm1hcChmdW5jdGlvbihwb2ludCkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdG1vZGVsOiBwb2ludC5fbW9kZWwsXHJcblx0XHRcdFx0ZGVsdGFLOiAwLFxyXG5cdFx0XHRcdG1LOiAwXHJcblx0XHRcdH07XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgc2xvcGVzIChkZWx0YUspIGFuZCBpbml0aWFsaXplIHRhbmdlbnRzIChtSylcclxuXHRcdHZhciBwb2ludHNMZW4gPSBwb2ludHNXaXRoVGFuZ2VudHMubGVuZ3RoO1xyXG5cdFx0dmFyIGksIHBvaW50QmVmb3JlLCBwb2ludEN1cnJlbnQsIHBvaW50QWZ0ZXI7XHJcblx0XHRmb3IgKGkgPSAwOyBpIDwgcG9pbnRzTGVuOyArK2kpIHtcclxuXHRcdFx0cG9pbnRDdXJyZW50ID0gcG9pbnRzV2l0aFRhbmdlbnRzW2ldO1xyXG5cdFx0XHRpZiAocG9pbnRDdXJyZW50Lm1vZGVsLnNraXApIHtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cG9pbnRCZWZvcmUgPSBpID4gMCA/IHBvaW50c1dpdGhUYW5nZW50c1tpIC0gMV0gOiBudWxsO1xyXG5cdFx0XHRwb2ludEFmdGVyID0gaSA8IHBvaW50c0xlbiAtIDEgPyBwb2ludHNXaXRoVGFuZ2VudHNbaSArIDFdIDogbnVsbDtcclxuXHRcdFx0aWYgKHBvaW50QWZ0ZXIgJiYgIXBvaW50QWZ0ZXIubW9kZWwuc2tpcCkge1xyXG5cdFx0XHRcdHBvaW50Q3VycmVudC5kZWx0YUsgPSAocG9pbnRBZnRlci5tb2RlbC55IC0gcG9pbnRDdXJyZW50Lm1vZGVsLnkpIC8gKHBvaW50QWZ0ZXIubW9kZWwueCAtIHBvaW50Q3VycmVudC5tb2RlbC54KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCFwb2ludEJlZm9yZSB8fCBwb2ludEJlZm9yZS5tb2RlbC5za2lwKSB7XHJcblx0XHRcdFx0cG9pbnRDdXJyZW50Lm1LID0gcG9pbnRDdXJyZW50LmRlbHRhSztcclxuXHRcdFx0fSBlbHNlIGlmICghcG9pbnRBZnRlciB8fCBwb2ludEFmdGVyLm1vZGVsLnNraXApIHtcclxuXHRcdFx0XHRwb2ludEN1cnJlbnQubUsgPSBwb2ludEJlZm9yZS5kZWx0YUs7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5zaWduKHBvaW50QmVmb3JlLmRlbHRhSykgIT09IHRoaXMuc2lnbihwb2ludEN1cnJlbnQuZGVsdGFLKSkge1xyXG5cdFx0XHRcdHBvaW50Q3VycmVudC5tSyA9IDA7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cG9pbnRDdXJyZW50Lm1LID0gKHBvaW50QmVmb3JlLmRlbHRhSyArIHBvaW50Q3VycmVudC5kZWx0YUspIC8gMjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkanVzdCB0YW5nZW50cyB0byBlbnN1cmUgbW9ub3RvbmljIHByb3BlcnRpZXNcclxuXHRcdHZhciBhbHBoYUssIGJldGFLLCB0YXVLLCBzcXVhcmVkTWFnbml0dWRlO1xyXG5cdFx0Zm9yIChpID0gMDsgaSA8IHBvaW50c0xlbiAtIDE7ICsraSkge1xyXG5cdFx0XHRwb2ludEN1cnJlbnQgPSBwb2ludHNXaXRoVGFuZ2VudHNbaV07XHJcblx0XHRcdHBvaW50QWZ0ZXIgPSBwb2ludHNXaXRoVGFuZ2VudHNbaSArIDFdO1xyXG5cdFx0XHRpZiAocG9pbnRDdXJyZW50Lm1vZGVsLnNraXAgfHwgcG9pbnRBZnRlci5tb2RlbC5za2lwKSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChoZWxwZXJzLmFsbW9zdEVxdWFscyhwb2ludEN1cnJlbnQuZGVsdGFLLCAwLCB0aGlzLkVQU0lMT04pKSB7XHJcblx0XHRcdFx0cG9pbnRDdXJyZW50Lm1LID0gcG9pbnRBZnRlci5tSyA9IDA7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGFscGhhSyA9IHBvaW50Q3VycmVudC5tSyAvIHBvaW50Q3VycmVudC5kZWx0YUs7XHJcblx0XHRcdGJldGFLID0gcG9pbnRBZnRlci5tSyAvIHBvaW50Q3VycmVudC5kZWx0YUs7XHJcblx0XHRcdHNxdWFyZWRNYWduaXR1ZGUgPSBNYXRoLnBvdyhhbHBoYUssIDIpICsgTWF0aC5wb3coYmV0YUssIDIpO1xyXG5cdFx0XHRpZiAoc3F1YXJlZE1hZ25pdHVkZSA8PSA5KSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRhdUsgPSAzIC8gTWF0aC5zcXJ0KHNxdWFyZWRNYWduaXR1ZGUpO1xyXG5cdFx0XHRwb2ludEN1cnJlbnQubUsgPSBhbHBoYUsgKiB0YXVLICogcG9pbnRDdXJyZW50LmRlbHRhSztcclxuXHRcdFx0cG9pbnRBZnRlci5tSyA9IGJldGFLICogdGF1SyAqIHBvaW50Q3VycmVudC5kZWx0YUs7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29tcHV0ZSBjb250cm9sIHBvaW50c1xyXG5cdFx0dmFyIGRlbHRhWDtcclxuXHRcdGZvciAoaSA9IDA7IGkgPCBwb2ludHNMZW47ICsraSkge1xyXG5cdFx0XHRwb2ludEN1cnJlbnQgPSBwb2ludHNXaXRoVGFuZ2VudHNbaV07XHJcblx0XHRcdGlmIChwb2ludEN1cnJlbnQubW9kZWwuc2tpcCkge1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwb2ludEJlZm9yZSA9IGkgPiAwID8gcG9pbnRzV2l0aFRhbmdlbnRzW2kgLSAxXSA6IG51bGw7XHJcblx0XHRcdHBvaW50QWZ0ZXIgPSBpIDwgcG9pbnRzTGVuIC0gMSA/IHBvaW50c1dpdGhUYW5nZW50c1tpICsgMV0gOiBudWxsO1xyXG5cdFx0XHRpZiAocG9pbnRCZWZvcmUgJiYgIXBvaW50QmVmb3JlLm1vZGVsLnNraXApIHtcclxuXHRcdFx0XHRkZWx0YVggPSAocG9pbnRDdXJyZW50Lm1vZGVsLnggLSBwb2ludEJlZm9yZS5tb2RlbC54KSAvIDM7XHJcblx0XHRcdFx0cG9pbnRDdXJyZW50Lm1vZGVsLmNvbnRyb2xQb2ludFByZXZpb3VzWCA9IHBvaW50Q3VycmVudC5tb2RlbC54IC0gZGVsdGFYO1xyXG5cdFx0XHRcdHBvaW50Q3VycmVudC5tb2RlbC5jb250cm9sUG9pbnRQcmV2aW91c1kgPSBwb2ludEN1cnJlbnQubW9kZWwueSAtIGRlbHRhWCAqIHBvaW50Q3VycmVudC5tSztcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAocG9pbnRBZnRlciAmJiAhcG9pbnRBZnRlci5tb2RlbC5za2lwKSB7XHJcblx0XHRcdFx0ZGVsdGFYID0gKHBvaW50QWZ0ZXIubW9kZWwueCAtIHBvaW50Q3VycmVudC5tb2RlbC54KSAvIDM7XHJcblx0XHRcdFx0cG9pbnRDdXJyZW50Lm1vZGVsLmNvbnRyb2xQb2ludE5leHRYID0gcG9pbnRDdXJyZW50Lm1vZGVsLnggKyBkZWx0YVg7XHJcblx0XHRcdFx0cG9pbnRDdXJyZW50Lm1vZGVsLmNvbnRyb2xQb2ludE5leHRZID0gcG9pbnRDdXJyZW50Lm1vZGVsLnkgKyBkZWx0YVggKiBwb2ludEN1cnJlbnQubUs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cdGhlbHBlcnMubmV4dEl0ZW0gPSBmdW5jdGlvbihjb2xsZWN0aW9uLCBpbmRleCwgbG9vcCkge1xyXG5cdFx0aWYgKGxvb3ApIHtcclxuXHRcdFx0cmV0dXJuIGluZGV4ID49IGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSA/IGNvbGxlY3Rpb25bMF0gOiBjb2xsZWN0aW9uW2luZGV4ICsgMV07XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gaW5kZXggPj0gY29sbGVjdGlvbi5sZW5ndGggLSAxID8gY29sbGVjdGlvbltjb2xsZWN0aW9uLmxlbmd0aCAtIDFdIDogY29sbGVjdGlvbltpbmRleCArIDFdO1xyXG5cdH07XHJcblx0aGVscGVycy5wcmV2aW91c0l0ZW0gPSBmdW5jdGlvbihjb2xsZWN0aW9uLCBpbmRleCwgbG9vcCkge1xyXG5cdFx0aWYgKGxvb3ApIHtcclxuXHRcdFx0cmV0dXJuIGluZGV4IDw9IDAgPyBjb2xsZWN0aW9uW2NvbGxlY3Rpb24ubGVuZ3RoIC0gMV0gOiBjb2xsZWN0aW9uW2luZGV4IC0gMV07XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gaW5kZXggPD0gMCA/IGNvbGxlY3Rpb25bMF0gOiBjb2xsZWN0aW9uW2luZGV4IC0gMV07XHJcblx0fTtcclxuXHQvLyBJbXBsZW1lbnRhdGlvbiBvZiB0aGUgbmljZSBudW1iZXIgYWxnb3JpdGhtIHVzZWQgaW4gZGV0ZXJtaW5pbmcgd2hlcmUgYXhpcyBsYWJlbHMgd2lsbCBnb1xyXG5cdGhlbHBlcnMubmljZU51bSA9IGZ1bmN0aW9uKHJhbmdlLCByb3VuZCkge1xyXG5cdFx0dmFyIGV4cG9uZW50ID0gTWF0aC5mbG9vcihoZWxwZXJzLmxvZzEwKHJhbmdlKSk7XHJcblx0XHR2YXIgZnJhY3Rpb24gPSByYW5nZSAvIE1hdGgucG93KDEwLCBleHBvbmVudCk7XHJcblx0XHR2YXIgbmljZUZyYWN0aW9uO1xyXG5cclxuXHRcdGlmIChyb3VuZCkge1xyXG5cdFx0XHRpZiAoZnJhY3Rpb24gPCAxLjUpIHtcclxuXHRcdFx0XHRuaWNlRnJhY3Rpb24gPSAxO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGZyYWN0aW9uIDwgMykge1xyXG5cdFx0XHRcdG5pY2VGcmFjdGlvbiA9IDI7XHJcblx0XHRcdH0gZWxzZSBpZiAoZnJhY3Rpb24gPCA3KSB7XHJcblx0XHRcdFx0bmljZUZyYWN0aW9uID0gNTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRuaWNlRnJhY3Rpb24gPSAxMDtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmIChmcmFjdGlvbiA8PSAxLjApIHtcclxuXHRcdFx0bmljZUZyYWN0aW9uID0gMTtcclxuXHRcdH0gZWxzZSBpZiAoZnJhY3Rpb24gPD0gMikge1xyXG5cdFx0XHRuaWNlRnJhY3Rpb24gPSAyO1xyXG5cdFx0fSBlbHNlIGlmIChmcmFjdGlvbiA8PSA1KSB7XHJcblx0XHRcdG5pY2VGcmFjdGlvbiA9IDU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRuaWNlRnJhY3Rpb24gPSAxMDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbmljZUZyYWN0aW9uICogTWF0aC5wb3coMTAsIGV4cG9uZW50KTtcclxuXHR9O1xyXG5cdC8vIEVhc2luZyBmdW5jdGlvbnMgYWRhcHRlZCBmcm9tIFJvYmVydCBQZW5uZXIncyBlYXNpbmcgZXF1YXRpb25zXHJcblx0Ly8gaHR0cDovL3d3dy5yb2JlcnRwZW5uZXIuY29tL2Vhc2luZy9cclxuXHR2YXIgZWFzaW5nRWZmZWN0cyA9IGhlbHBlcnMuZWFzaW5nRWZmZWN0cyA9IHtcclxuXHRcdGxpbmVhcjogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gdDtcclxuXHRcdH0sXHJcblx0XHRlYXNlSW5RdWFkOiBmdW5jdGlvbih0KSB7XHJcblx0XHRcdHJldHVybiB0ICogdDtcclxuXHRcdH0sXHJcblx0XHRlYXNlT3V0UXVhZDogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gLTEgKiB0ICogKHQgLSAyKTtcclxuXHRcdH0sXHJcblx0XHRlYXNlSW5PdXRRdWFkOiBmdW5jdGlvbih0KSB7XHJcblx0XHRcdGlmICgodCAvPSAxIC8gMikgPCAxKSB7XHJcblx0XHRcdFx0cmV0dXJuIDEgLyAyICogdCAqIHQ7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIC0xIC8gMiAqICgoLS10KSAqICh0IC0gMikgLSAxKTtcclxuXHRcdH0sXHJcblx0XHRlYXNlSW5DdWJpYzogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gdCAqIHQgKiB0O1xyXG5cdFx0fSxcclxuXHRcdGVhc2VPdXRDdWJpYzogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gMSAqICgodCA9IHQgLyAxIC0gMSkgKiB0ICogdCArIDEpO1xyXG5cdFx0fSxcclxuXHRcdGVhc2VJbk91dEN1YmljOiBmdW5jdGlvbih0KSB7XHJcblx0XHRcdGlmICgodCAvPSAxIC8gMikgPCAxKSB7XHJcblx0XHRcdFx0cmV0dXJuIDEgLyAyICogdCAqIHQgKiB0O1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiAxIC8gMiAqICgodCAtPSAyKSAqIHQgKiB0ICsgMik7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZUluUXVhcnQ6IGZ1bmN0aW9uKHQpIHtcclxuXHRcdFx0cmV0dXJuIHQgKiB0ICogdCAqIHQ7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZU91dFF1YXJ0OiBmdW5jdGlvbih0KSB7XHJcblx0XHRcdHJldHVybiAtMSAqICgodCA9IHQgLyAxIC0gMSkgKiB0ICogdCAqIHQgLSAxKTtcclxuXHRcdH0sXHJcblx0XHRlYXNlSW5PdXRRdWFydDogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRpZiAoKHQgLz0gMSAvIDIpIDwgMSkge1xyXG5cdFx0XHRcdHJldHVybiAxIC8gMiAqIHQgKiB0ICogdCAqIHQ7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIC0xIC8gMiAqICgodCAtPSAyKSAqIHQgKiB0ICogdCAtIDIpO1xyXG5cdFx0fSxcclxuXHRcdGVhc2VJblF1aW50OiBmdW5jdGlvbih0KSB7XHJcblx0XHRcdHJldHVybiAxICogKHQgLz0gMSkgKiB0ICogdCAqIHQgKiB0O1xyXG5cdFx0fSxcclxuXHRcdGVhc2VPdXRRdWludDogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gMSAqICgodCA9IHQgLyAxIC0gMSkgKiB0ICogdCAqIHQgKiB0ICsgMSk7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZUluT3V0UXVpbnQ6IGZ1bmN0aW9uKHQpIHtcclxuXHRcdFx0aWYgKCh0IC89IDEgLyAyKSA8IDEpIHtcclxuXHRcdFx0XHRyZXR1cm4gMSAvIDIgKiB0ICogdCAqIHQgKiB0ICogdDtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gMSAvIDIgKiAoKHQgLT0gMikgKiB0ICogdCAqIHQgKiB0ICsgMik7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZUluU2luZTogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gLTEgKiBNYXRoLmNvcyh0IC8gMSAqIChNYXRoLlBJIC8gMikpICsgMTtcclxuXHRcdH0sXHJcblx0XHRlYXNlT3V0U2luZTogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gMSAqIE1hdGguc2luKHQgLyAxICogKE1hdGguUEkgLyAyKSk7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZUluT3V0U2luZTogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gLTEgLyAyICogKE1hdGguY29zKE1hdGguUEkgKiB0IC8gMSkgLSAxKTtcclxuXHRcdH0sXHJcblx0XHRlYXNlSW5FeHBvOiBmdW5jdGlvbih0KSB7XHJcblx0XHRcdHJldHVybiAodCA9PT0gMCkgPyAxIDogMSAqIE1hdGgucG93KDIsIDEwICogKHQgLyAxIC0gMSkpO1xyXG5cdFx0fSxcclxuXHRcdGVhc2VPdXRFeHBvOiBmdW5jdGlvbih0KSB7XHJcblx0XHRcdHJldHVybiAodCA9PT0gMSkgPyAxIDogMSAqICgtTWF0aC5wb3coMiwgLTEwICogdCAvIDEpICsgMSk7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZUluT3V0RXhwbzogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRpZiAodCA9PT0gMCkge1xyXG5cdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0ID09PSAxKSB7XHJcblx0XHRcdFx0cmV0dXJuIDE7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCh0IC89IDEgLyAyKSA8IDEpIHtcclxuXHRcdFx0XHRyZXR1cm4gMSAvIDIgKiBNYXRoLnBvdygyLCAxMCAqICh0IC0gMSkpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiAxIC8gMiAqICgtTWF0aC5wb3coMiwgLTEwICogLS10KSArIDIpO1xyXG5cdFx0fSxcclxuXHRcdGVhc2VJbkNpcmM6IGZ1bmN0aW9uKHQpIHtcclxuXHRcdFx0aWYgKHQgPj0gMSkge1xyXG5cdFx0XHRcdHJldHVybiB0O1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiAtMSAqIChNYXRoLnNxcnQoMSAtICh0IC89IDEpICogdCkgLSAxKTtcclxuXHRcdH0sXHJcblx0XHRlYXNlT3V0Q2lyYzogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gMSAqIE1hdGguc3FydCgxIC0gKHQgPSB0IC8gMSAtIDEpICogdCk7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZUluT3V0Q2lyYzogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRpZiAoKHQgLz0gMSAvIDIpIDwgMSkge1xyXG5cdFx0XHRcdHJldHVybiAtMSAvIDIgKiAoTWF0aC5zcXJ0KDEgLSB0ICogdCkgLSAxKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gMSAvIDIgKiAoTWF0aC5zcXJ0KDEgLSAodCAtPSAyKSAqIHQpICsgMSk7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZUluRWxhc3RpYzogZnVuY3Rpb24odCkge1xyXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XHJcblx0XHRcdHZhciBwID0gMDtcclxuXHRcdFx0dmFyIGEgPSAxO1xyXG5cdFx0XHRpZiAodCA9PT0gMCkge1xyXG5cdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICgodCAvPSAxKSA9PT0gMSkge1xyXG5cdFx0XHRcdHJldHVybiAxO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICghcCkge1xyXG5cdFx0XHRcdHAgPSAxICogMC4zO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChhIDwgTWF0aC5hYnMoMSkpIHtcclxuXHRcdFx0XHRhID0gMTtcclxuXHRcdFx0XHRzID0gcCAvIDQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cyA9IHAgLyAoMiAqIE1hdGguUEkpICogTWF0aC5hc2luKDEgLyBhKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gLShhICogTWF0aC5wb3coMiwgMTAgKiAodCAtPSAxKSkgKiBNYXRoLnNpbigodCAqIDEgLSBzKSAqICgyICogTWF0aC5QSSkgLyBwKSk7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZU91dEVsYXN0aWM6IGZ1bmN0aW9uKHQpIHtcclxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4O1xyXG5cdFx0XHR2YXIgcCA9IDA7XHJcblx0XHRcdHZhciBhID0gMTtcclxuXHRcdFx0aWYgKHQgPT09IDApIHtcclxuXHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoKHQgLz0gMSkgPT09IDEpIHtcclxuXHRcdFx0XHRyZXR1cm4gMTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIXApIHtcclxuXHRcdFx0XHRwID0gMSAqIDAuMztcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoYSA8IE1hdGguYWJzKDEpKSB7XHJcblx0XHRcdFx0YSA9IDE7XHJcblx0XHRcdFx0cyA9IHAgLyA0O1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHMgPSBwIC8gKDIgKiBNYXRoLlBJKSAqIE1hdGguYXNpbigxIC8gYSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGEgKiBNYXRoLnBvdygyLCAtMTAgKiB0KSAqIE1hdGguc2luKCh0ICogMSAtIHMpICogKDIgKiBNYXRoLlBJKSAvIHApICsgMTtcclxuXHRcdH0sXHJcblx0XHRlYXNlSW5PdXRFbGFzdGljOiBmdW5jdGlvbih0KSB7XHJcblx0XHRcdHZhciBzID0gMS43MDE1ODtcclxuXHRcdFx0dmFyIHAgPSAwO1xyXG5cdFx0XHR2YXIgYSA9IDE7XHJcblx0XHRcdGlmICh0ID09PSAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCh0IC89IDEgLyAyKSA9PT0gMikge1xyXG5cdFx0XHRcdHJldHVybiAxO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICghcCkge1xyXG5cdFx0XHRcdHAgPSAxICogKDAuMyAqIDEuNSk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGEgPCBNYXRoLmFicygxKSkge1xyXG5cdFx0XHRcdGEgPSAxO1xyXG5cdFx0XHRcdHMgPSBwIC8gNDtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRzID0gcCAvICgyICogTWF0aC5QSSkgKiBNYXRoLmFzaW4oMSAvIGEpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0IDwgMSkge1xyXG5cdFx0XHRcdHJldHVybiAtMC41ICogKGEgKiBNYXRoLnBvdygyLCAxMCAqICh0IC09IDEpKSAqIE1hdGguc2luKCh0ICogMSAtIHMpICogKDIgKiBNYXRoLlBJKSAvIHApKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gYSAqIE1hdGgucG93KDIsIC0xMCAqICh0IC09IDEpKSAqIE1hdGguc2luKCh0ICogMSAtIHMpICogKDIgKiBNYXRoLlBJKSAvIHApICogMC41ICsgMTtcclxuXHRcdH0sXHJcblx0XHRlYXNlSW5CYWNrOiBmdW5jdGlvbih0KSB7XHJcblx0XHRcdHZhciBzID0gMS43MDE1ODtcclxuXHRcdFx0cmV0dXJuIDEgKiAodCAvPSAxKSAqIHQgKiAoKHMgKyAxKSAqIHQgLSBzKTtcclxuXHRcdH0sXHJcblx0XHRlYXNlT3V0QmFjazogZnVuY3Rpb24odCkge1xyXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XHJcblx0XHRcdHJldHVybiAxICogKCh0ID0gdCAvIDEgLSAxKSAqIHQgKiAoKHMgKyAxKSAqIHQgKyBzKSArIDEpO1xyXG5cdFx0fSxcclxuXHRcdGVhc2VJbk91dEJhY2s6IGZ1bmN0aW9uKHQpIHtcclxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4O1xyXG5cdFx0XHRpZiAoKHQgLz0gMSAvIDIpIDwgMSkge1xyXG5cdFx0XHRcdHJldHVybiAxIC8gMiAqICh0ICogdCAqICgoKHMgKj0gKDEuNTI1KSkgKyAxKSAqIHQgLSBzKSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIDEgLyAyICogKCh0IC09IDIpICogdCAqICgoKHMgKj0gKDEuNTI1KSkgKyAxKSAqIHQgKyBzKSArIDIpO1xyXG5cdFx0fSxcclxuXHRcdGVhc2VJbkJvdW5jZTogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRyZXR1cm4gMSAtIGVhc2luZ0VmZmVjdHMuZWFzZU91dEJvdW5jZSgxIC0gdCk7XHJcblx0XHR9LFxyXG5cdFx0ZWFzZU91dEJvdW5jZTogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRpZiAoKHQgLz0gMSkgPCAoMSAvIDIuNzUpKSB7XHJcblx0XHRcdFx0cmV0dXJuIDEgKiAoNy41NjI1ICogdCAqIHQpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHQgPCAoMiAvIDIuNzUpKSB7XHJcblx0XHRcdFx0cmV0dXJuIDEgKiAoNy41NjI1ICogKHQgLT0gKDEuNSAvIDIuNzUpKSAqIHQgKyAwLjc1KTtcclxuXHRcdFx0fSBlbHNlIGlmICh0IDwgKDIuNSAvIDIuNzUpKSB7XHJcblx0XHRcdFx0cmV0dXJuIDEgKiAoNy41NjI1ICogKHQgLT0gKDIuMjUgLyAyLjc1KSkgKiB0ICsgMC45Mzc1KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gMSAqICg3LjU2MjUgKiAodCAtPSAoMi42MjUgLyAyLjc1KSkgKiB0ICsgMC45ODQzNzUpO1xyXG5cdFx0fSxcclxuXHRcdGVhc2VJbk91dEJvdW5jZTogZnVuY3Rpb24odCkge1xyXG5cdFx0XHRpZiAodCA8IDEgLyAyKSB7XHJcblx0XHRcdFx0cmV0dXJuIGVhc2luZ0VmZmVjdHMuZWFzZUluQm91bmNlKHQgKiAyKSAqIDAuNTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZWFzaW5nRWZmZWN0cy5lYXNlT3V0Qm91bmNlKHQgKiAyIC0gMSkgKiAwLjUgKyAxICogMC41O1xyXG5cdFx0fVxyXG5cdH07XHJcblx0Ly8gUmVxdWVzdCBhbmltYXRpb24gcG9seWZpbGwgLSBodHRwOi8vd3d3LnBhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cclxuXHRoZWxwZXJzLnJlcXVlc3RBbmltRnJhbWUgPSAoZnVuY3Rpb24oKSB7XHJcblx0XHRyZXR1cm4gZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuXHRcdFx0XHRyZXR1cm4gc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTtcclxuXHRcdFx0fTtcclxuXHR9KCkpO1xyXG5cdGhlbHBlcnMuY2FuY2VsQW5pbUZyYW1lID0gKGZ1bmN0aW9uKCkge1xyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcblx0XHRcdFx0cmV0dXJuIGNsZWFyVGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTtcclxuXHRcdFx0fTtcclxuXHR9KCkpO1xyXG5cdC8vIC0tIERPTSBtZXRob2RzXHJcblx0aGVscGVycy5nZXRSZWxhdGl2ZVBvc2l0aW9uID0gZnVuY3Rpb24oZXZ0LCBjaGFydCkge1xyXG5cdFx0dmFyIG1vdXNlWCwgbW91c2VZO1xyXG5cdFx0dmFyIGUgPSBldnQub3JpZ2luYWxFdmVudCB8fCBldnQsXHJcblx0XHRcdGNhbnZhcyA9IGV2dC5jdXJyZW50VGFyZ2V0IHx8IGV2dC5zcmNFbGVtZW50LFxyXG5cdFx0XHRib3VuZGluZ1JlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG5cdFx0dmFyIHRvdWNoZXMgPSBlLnRvdWNoZXM7XHJcblx0XHRpZiAodG91Y2hlcyAmJiB0b3VjaGVzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0bW91c2VYID0gdG91Y2hlc1swXS5jbGllbnRYO1xyXG5cdFx0XHRtb3VzZVkgPSB0b3VjaGVzWzBdLmNsaWVudFk7XHJcblxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bW91c2VYID0gZS5jbGllbnRYO1xyXG5cdFx0XHRtb3VzZVkgPSBlLmNsaWVudFk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2NhbGUgbW91c2UgY29vcmRpbmF0ZXMgaW50byBjYW52YXMgY29vcmRpbmF0ZXNcclxuXHRcdC8vIGJ5IGZvbGxvd2luZyB0aGUgcGF0dGVybiBsYWlkIG91dCBieSAnamVycnlqJyBpbiB0aGUgY29tbWVudHMgb2ZcclxuXHRcdC8vIGh0dHA6Ly93d3cuaHRtbDVjYW52YXN0dXRvcmlhbHMuY29tL2FkdmFuY2VkL2h0bWw1LWNhbnZhcy1tb3VzZS1jb29yZGluYXRlcy9cclxuXHRcdHZhciBwYWRkaW5nTGVmdCA9IHBhcnNlRmxvYXQoaGVscGVycy5nZXRTdHlsZShjYW52YXMsICdwYWRkaW5nLWxlZnQnKSk7XHJcblx0XHR2YXIgcGFkZGluZ1RvcCA9IHBhcnNlRmxvYXQoaGVscGVycy5nZXRTdHlsZShjYW52YXMsICdwYWRkaW5nLXRvcCcpKTtcclxuXHRcdHZhciBwYWRkaW5nUmlnaHQgPSBwYXJzZUZsb2F0KGhlbHBlcnMuZ2V0U3R5bGUoY2FudmFzLCAncGFkZGluZy1yaWdodCcpKTtcclxuXHRcdHZhciBwYWRkaW5nQm90dG9tID0gcGFyc2VGbG9hdChoZWxwZXJzLmdldFN0eWxlKGNhbnZhcywgJ3BhZGRpbmctYm90dG9tJykpO1xyXG5cdFx0dmFyIHdpZHRoID0gYm91bmRpbmdSZWN0LnJpZ2h0IC0gYm91bmRpbmdSZWN0LmxlZnQgLSBwYWRkaW5nTGVmdCAtIHBhZGRpbmdSaWdodDtcclxuXHRcdHZhciBoZWlnaHQgPSBib3VuZGluZ1JlY3QuYm90dG9tIC0gYm91bmRpbmdSZWN0LnRvcCAtIHBhZGRpbmdUb3AgLSBwYWRkaW5nQm90dG9tO1xyXG5cclxuXHRcdC8vIFdlIGRpdmlkZSBieSB0aGUgY3VycmVudCBkZXZpY2UgcGl4ZWwgcmF0aW8sIGJlY2F1c2UgdGhlIGNhbnZhcyBpcyBzY2FsZWQgdXAgYnkgdGhhdCBhbW91bnQgaW4gZWFjaCBkaXJlY3Rpb24uIEhvd2V2ZXJcclxuXHRcdC8vIHRoZSBiYWNrZW5kIG1vZGVsIGlzIGluIHVuc2NhbGVkIGNvb3JkaW5hdGVzLiBTaW5jZSB3ZSBhcmUgZ29pbmcgdG8gZGVhbCB3aXRoIG91ciBtb2RlbCBjb29yZGluYXRlcywgd2UgZ28gYmFjayBoZXJlXHJcblx0XHRtb3VzZVggPSBNYXRoLnJvdW5kKChtb3VzZVggLSBib3VuZGluZ1JlY3QubGVmdCAtIHBhZGRpbmdMZWZ0KSAvICh3aWR0aCkgKiBjYW52YXMud2lkdGggLyBjaGFydC5jdXJyZW50RGV2aWNlUGl4ZWxSYXRpbyk7XHJcblx0XHRtb3VzZVkgPSBNYXRoLnJvdW5kKChtb3VzZVkgLSBib3VuZGluZ1JlY3QudG9wIC0gcGFkZGluZ1RvcCkgLyAoaGVpZ2h0KSAqIGNhbnZhcy5oZWlnaHQgLyBjaGFydC5jdXJyZW50RGV2aWNlUGl4ZWxSYXRpbyk7XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0eDogbW91c2VYLFxyXG5cdFx0XHR5OiBtb3VzZVlcclxuXHRcdH07XHJcblxyXG5cdH07XHJcblx0aGVscGVycy5hZGRFdmVudCA9IGZ1bmN0aW9uKG5vZGUsIGV2ZW50VHlwZSwgbWV0aG9kKSB7XHJcblx0XHRpZiAobm9kZS5hZGRFdmVudExpc3RlbmVyKSB7XHJcblx0XHRcdG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIG1ldGhvZCk7XHJcblx0XHR9IGVsc2UgaWYgKG5vZGUuYXR0YWNoRXZlbnQpIHtcclxuXHRcdFx0bm9kZS5hdHRhY2hFdmVudCgnb24nICsgZXZlbnRUeXBlLCBtZXRob2QpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bm9kZVsnb24nICsgZXZlbnRUeXBlXSA9IG1ldGhvZDtcclxuXHRcdH1cclxuXHR9O1xyXG5cdGhlbHBlcnMucmVtb3ZlRXZlbnQgPSBmdW5jdGlvbihub2RlLCBldmVudFR5cGUsIGhhbmRsZXIpIHtcclxuXHRcdGlmIChub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIpIHtcclxuXHRcdFx0bm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgaGFuZGxlciwgZmFsc2UpO1xyXG5cdFx0fSBlbHNlIGlmIChub2RlLmRldGFjaEV2ZW50KSB7XHJcblx0XHRcdG5vZGUuZGV0YWNoRXZlbnQoJ29uJyArIGV2ZW50VHlwZSwgaGFuZGxlcik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRub2RlWydvbicgKyBldmVudFR5cGVdID0gaGVscGVycy5ub29wO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0aGVscGVycy5iaW5kRXZlbnRzID0gZnVuY3Rpb24oY2hhcnRJbnN0YW5jZSwgYXJyYXlPZkV2ZW50cywgaGFuZGxlcikge1xyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBldmVudHMgb2JqZWN0IGlmIGl0J3Mgbm90IGFscmVhZHkgcHJlc2VudFxyXG5cdFx0dmFyIGV2ZW50cyA9IGNoYXJ0SW5zdGFuY2UuZXZlbnRzID0gY2hhcnRJbnN0YW5jZS5ldmVudHMgfHwge307XHJcblxyXG5cdFx0aGVscGVycy5lYWNoKGFycmF5T2ZFdmVudHMsIGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xyXG5cdFx0XHRldmVudHNbZXZlbnROYW1lXSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdGhhbmRsZXIuYXBwbHkoY2hhcnRJbnN0YW5jZSwgYXJndW1lbnRzKTtcclxuXHRcdFx0fTtcclxuXHRcdFx0aGVscGVycy5hZGRFdmVudChjaGFydEluc3RhbmNlLmNoYXJ0LmNhbnZhcywgZXZlbnROYW1lLCBldmVudHNbZXZlbnROYW1lXSk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cdGhlbHBlcnMudW5iaW5kRXZlbnRzID0gZnVuY3Rpb24oY2hhcnRJbnN0YW5jZSwgYXJyYXlPZkV2ZW50cykge1xyXG5cdFx0dmFyIGNhbnZhcyA9IGNoYXJ0SW5zdGFuY2UuY2hhcnQuY2FudmFzO1xyXG5cdFx0aGVscGVycy5lYWNoKGFycmF5T2ZFdmVudHMsIGZ1bmN0aW9uKGhhbmRsZXIsIGV2ZW50TmFtZSkge1xyXG5cdFx0XHRoZWxwZXJzLnJlbW92ZUV2ZW50KGNhbnZhcywgZXZlbnROYW1lLCBoYW5kbGVyKTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdC8vIFByaXZhdGUgaGVscGVyIGZ1bmN0aW9uIHRvIGNvbnZlcnQgbWF4LXdpZHRoL21heC1oZWlnaHQgdmFsdWVzIHRoYXQgbWF5IGJlIHBlcmNlbnRhZ2VzIGludG8gYSBudW1iZXJcclxuXHRmdW5jdGlvbiBwYXJzZU1heFN0eWxlKHN0eWxlVmFsdWUsIG5vZGUsIHBhcmVudFByb3BlcnR5KSB7XHJcblx0XHR2YXIgdmFsdWVJblBpeGVscztcclxuXHRcdGlmICh0eXBlb2Yoc3R5bGVWYWx1ZSkgPT09ICdzdHJpbmcnKSB7XHJcblx0XHRcdHZhbHVlSW5QaXhlbHMgPSBwYXJzZUludChzdHlsZVZhbHVlLCAxMCk7XHJcblxyXG5cdFx0XHRpZiAoc3R5bGVWYWx1ZS5pbmRleE9mKCclJykgIT09IC0xKSB7XHJcblx0XHRcdFx0Ly8gcGVyY2VudGFnZSAqIHNpemUgaW4gZGltZW5zaW9uXHJcblx0XHRcdFx0dmFsdWVJblBpeGVscyA9IHZhbHVlSW5QaXhlbHMgLyAxMDAgKiBub2RlLnBhcmVudE5vZGVbcGFyZW50UHJvcGVydHldO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR2YWx1ZUluUGl4ZWxzID0gc3R5bGVWYWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdmFsdWVJblBpeGVscztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJldHVybnMgaWYgdGhlIGdpdmVuIHZhbHVlIGNvbnRhaW5zIGFuIGVmZmVjdGl2ZSBjb25zdHJhaW50LlxyXG5cdCAqIEBwcml2YXRlXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gaXNDb25zdHJhaW5lZFZhbHVlKHZhbHVlKSB7XHJcblx0XHRyZXR1cm4gdmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gJ25vbmUnO1xyXG5cdH1cclxuXHJcblx0Ly8gUHJpdmF0ZSBoZWxwZXIgdG8gZ2V0IGEgY29uc3RyYWludCBkaW1lbnNpb25cclxuXHQvLyBAcGFyYW0gZG9tTm9kZSA6IHRoZSBub2RlIHRvIGNoZWNrIHRoZSBjb25zdHJhaW50IG9uXHJcblx0Ly8gQHBhcmFtIG1heFN0eWxlIDogdGhlIHN0eWxlIHRoYXQgZGVmaW5lcyB0aGUgbWF4aW11bSBmb3IgdGhlIGRpcmVjdGlvbiB3ZSBhcmUgdXNpbmcgKG1heFdpZHRoIC8gbWF4SGVpZ2h0KVxyXG5cdC8vIEBwYXJhbSBwZXJjZW50YWdlUHJvcGVydHkgOiBwcm9wZXJ0eSBvZiBwYXJlbnQgdG8gdXNlIHdoZW4gY2FsY3VsYXRpbmcgd2lkdGggYXMgYSBwZXJjZW50YWdlXHJcblx0Ly8gQHNlZSBodHRwOi8vd3d3Lm5hdGhhbmFlbGpvbmVzLmNvbS9ibG9nLzIwMTMvcmVhZGluZy1tYXgtd2lkdGgtY3Jvc3MtYnJvd3NlclxyXG5cdGZ1bmN0aW9uIGdldENvbnN0cmFpbnREaW1lbnNpb24oZG9tTm9kZSwgbWF4U3R5bGUsIHBlcmNlbnRhZ2VQcm9wZXJ0eSkge1xyXG5cdFx0dmFyIHZpZXcgPSBkb2N1bWVudC5kZWZhdWx0VmlldztcclxuXHRcdHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlO1xyXG5cdFx0dmFyIGNvbnN0cmFpbmVkTm9kZSA9IHZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShkb21Ob2RlKVttYXhTdHlsZV07XHJcblx0XHR2YXIgY29uc3RyYWluZWRDb250YWluZXIgPSB2aWV3LmdldENvbXB1dGVkU3R5bGUocGFyZW50Tm9kZSlbbWF4U3R5bGVdO1xyXG5cdFx0dmFyIGhhc0NOb2RlID0gaXNDb25zdHJhaW5lZFZhbHVlKGNvbnN0cmFpbmVkTm9kZSk7XHJcblx0XHR2YXIgaGFzQ0NvbnRhaW5lciA9IGlzQ29uc3RyYWluZWRWYWx1ZShjb25zdHJhaW5lZENvbnRhaW5lcik7XHJcblx0XHR2YXIgaW5maW5pdHkgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XHJcblxyXG5cdFx0aWYgKGhhc0NOb2RlIHx8IGhhc0NDb250YWluZXIpIHtcclxuXHRcdFx0cmV0dXJuIE1hdGgubWluKFxyXG5cdFx0XHRcdGhhc0NOb2RlPyBwYXJzZU1heFN0eWxlKGNvbnN0cmFpbmVkTm9kZSwgZG9tTm9kZSwgcGVyY2VudGFnZVByb3BlcnR5KSA6IGluZmluaXR5LFxyXG5cdFx0XHRcdGhhc0NDb250YWluZXI/IHBhcnNlTWF4U3R5bGUoY29uc3RyYWluZWRDb250YWluZXIsIHBhcmVudE5vZGUsIHBlcmNlbnRhZ2VQcm9wZXJ0eSkgOiBpbmZpbml0eSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuICdub25lJztcclxuXHR9XHJcblx0Ly8gcmV0dXJucyBOdW1iZXIgb3IgdW5kZWZpbmVkIGlmIG5vIGNvbnN0cmFpbnRcclxuXHRoZWxwZXJzLmdldENvbnN0cmFpbnRXaWR0aCA9IGZ1bmN0aW9uKGRvbU5vZGUpIHtcclxuXHRcdHJldHVybiBnZXRDb25zdHJhaW50RGltZW5zaW9uKGRvbU5vZGUsICdtYXgtd2lkdGgnLCAnY2xpZW50V2lkdGgnKTtcclxuXHR9O1xyXG5cdC8vIHJldHVybnMgTnVtYmVyIG9yIHVuZGVmaW5lZCBpZiBubyBjb25zdHJhaW50XHJcblx0aGVscGVycy5nZXRDb25zdHJhaW50SGVpZ2h0ID0gZnVuY3Rpb24oZG9tTm9kZSkge1xyXG5cdFx0cmV0dXJuIGdldENvbnN0cmFpbnREaW1lbnNpb24oZG9tTm9kZSwgJ21heC1oZWlnaHQnLCAnY2xpZW50SGVpZ2h0Jyk7XHJcblx0fTtcclxuXHRoZWxwZXJzLmdldE1heGltdW1XaWR0aCA9IGZ1bmN0aW9uKGRvbU5vZGUpIHtcclxuXHRcdHJldHVybiBkb21Ob2RlLnN0eWxlLndpZHRoOy8v55u05o6l55SoY2FudmFz5a695bqmXHJcblx0XHR2YXIgY29udGFpbmVyID0gZG9tTm9kZS5wYXJlbnROb2RlO1xyXG5cdFx0dmFyIHBhZGRpbmdMZWZ0ID0gcGFyc2VJbnQoaGVscGVycy5nZXRTdHlsZShjb250YWluZXIsICdwYWRkaW5nLWxlZnQnKSwgMTApO1xyXG5cdFx0dmFyIHBhZGRpbmdSaWdodCA9IHBhcnNlSW50KGhlbHBlcnMuZ2V0U3R5bGUoY29udGFpbmVyLCAncGFkZGluZy1yaWdodCcpLCAxMCk7XHJcblx0XHR2YXIgdyA9IGNvbnRhaW5lci5jbGllbnRXaWR0aCAtIHBhZGRpbmdMZWZ0IC0gcGFkZGluZ1JpZ2h0O1xyXG5cdFx0dmFyIGN3ID0gaGVscGVycy5nZXRDb25zdHJhaW50V2lkdGgoZG9tTm9kZSk7XHJcblx0XHRyZXR1cm4gaXNOYU4oY3cpPyB3IDogTWF0aC5taW4odywgY3cpO1xyXG5cdH07XHJcblx0aGVscGVycy5nZXRNYXhpbXVtSGVpZ2h0ID0gZnVuY3Rpb24oZG9tTm9kZSkge1xyXG5cdFx0cmV0dXJuIGRvbU5vZGUuc3R5bGUuaGVpZ2h0Oy8v55u05o6l55SoY2FudmFz6auY5bqmXHJcblx0XHR2YXIgY29udGFpbmVyID0gZG9tTm9kZS5wYXJlbnROb2RlO1xyXG5cdFx0dmFyIHBhZGRpbmdUb3AgPSBwYXJzZUludChoZWxwZXJzLmdldFN0eWxlKGNvbnRhaW5lciwgJ3BhZGRpbmctdG9wJyksIDEwKTtcclxuXHRcdHZhciBwYWRkaW5nQm90dG9tID0gcGFyc2VJbnQoaGVscGVycy5nZXRTdHlsZShjb250YWluZXIsICdwYWRkaW5nLWJvdHRvbScpLCAxMCk7XHJcblx0XHR2YXIgaCA9IGNvbnRhaW5lci5jbGllbnRIZWlnaHQgLSBwYWRkaW5nVG9wIC0gcGFkZGluZ0JvdHRvbTtcclxuXHRcdHZhciBjaCA9IGhlbHBlcnMuZ2V0Q29uc3RyYWludEhlaWdodChkb21Ob2RlKTtcclxuXHRcdHJldHVybiBpc05hTihjaCk/IGggOiBNYXRoLm1pbihoLCBjaCk7XHJcblx0fTtcclxuXHRoZWxwZXJzLmdldFN0eWxlID0gZnVuY3Rpb24oZWwsIHByb3BlcnR5KSB7XHJcblx0XHRyZXR1cm4gZWwuY3VycmVudFN0eWxlID9cclxuXHRcdFx0ZWwuY3VycmVudFN0eWxlW3Byb3BlcnR5XSA6XHJcblx0XHRcdGRvY3VtZW50LmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpLmdldFByb3BlcnR5VmFsdWUocHJvcGVydHkpO1xyXG5cdH07XHJcblx0aGVscGVycy5yZXRpbmFTY2FsZSA9IGZ1bmN0aW9uKGNoYXJ0KSB7XHJcblx0XHR2YXIgY3R4ID0gY2hhcnQuY3R4O1xyXG5cdFx0dmFyIGNhbnZhcyA9IGNoYXJ0LmNhbnZhcztcclxuXHRcdHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aDtcclxuXHRcdHZhciBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0O1xyXG5cdFx0dmFyIHBpeGVsUmF0aW8gPSBjaGFydC5jdXJyZW50RGV2aWNlUGl4ZWxSYXRpbyA9IGN0eC5kZXZpY2VQaXhlbFJhdGlvIHx8IDE7XHJcblxyXG5cdFx0aWYgKHBpeGVsUmF0aW8gIT09IDEpIHtcclxuXHRcdFx0Y2FudmFzLmhlaWdodCA9IGhlaWdodCAqIHBpeGVsUmF0aW87XHJcblx0XHRcdGNhbnZhcy53aWR0aCA9IHdpZHRoICogcGl4ZWxSYXRpbztcclxuXHRcdFx0Y3R4LnNjYWxlKHBpeGVsUmF0aW8sIHBpeGVsUmF0aW8pO1xyXG5cclxuXHRcdFx0Ly8gU3RvcmUgdGhlIGRldmljZSBwaXhlbCByYXRpbyBzbyB0aGF0IHdlIGNhbiBnbyBiYWNrd2FyZHMgaW4gYGRlc3Ryb3lgLlxyXG5cdFx0XHQvLyBUaGUgZGV2aWNlUGl4ZWxSYXRpbyBjaGFuZ2VzIHdpdGggem9vbSwgc28gdGhlcmUgYXJlIG5vIGd1YXJhbnRlZXMgdGhhdCBpdCBpcyB0aGUgc2FtZVxyXG5cdFx0XHQvLyB3aGVuIGRlc3Ryb3kgaXMgY2FsbGVkXHJcblx0XHRcdGNoYXJ0Lm9yaWdpbmFsRGV2aWNlUGl4ZWxSYXRpbyA9IGNoYXJ0Lm9yaWdpbmFsRGV2aWNlUGl4ZWxSYXRpbyB8fCBwaXhlbFJhdGlvO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0Ly8gLS0gQ2FudmFzIG1ldGhvZHNcclxuXHRoZWxwZXJzLmNsZWFyID0gZnVuY3Rpb24oY2hhcnQpIHtcclxuXHRcdGNoYXJ0LmN0eC5jbGVhclJlY3QoMCwgMCwgY2hhcnQud2lkdGgsIGNoYXJ0LmhlaWdodCk7XHJcblx0fTtcclxuXHRoZWxwZXJzLmZvbnRTdHJpbmcgPSBmdW5jdGlvbihwaXhlbFNpemUsIGZvbnRTdHlsZSwgZm9udEZhbWlseSkge1xyXG5cdFx0cmV0dXJuIGZvbnRTdHlsZSArICcgJyArIHBpeGVsU2l6ZSArICdweCAnICsgZm9udEZhbWlseTtcclxuXHR9O1xyXG5cdGhlbHBlcnMubG9uZ2VzdFRleHQgPSBmdW5jdGlvbihjdHgsIGZvbnQsIGFycmF5T2ZUaGluZ3MsIGNhY2hlKSB7XHJcblx0XHRjYWNoZSA9IGNhY2hlIHx8IHt9O1xyXG5cdFx0dmFyIGRhdGEgPSBjYWNoZS5kYXRhID0gY2FjaGUuZGF0YSB8fCB7fTtcclxuXHRcdHZhciBnYyA9IGNhY2hlLmdhcmJhZ2VDb2xsZWN0ID0gY2FjaGUuZ2FyYmFnZUNvbGxlY3QgfHwgW107XHJcblxyXG5cdFx0aWYgKGNhY2hlLmZvbnQgIT09IGZvbnQpIHtcclxuXHRcdFx0ZGF0YSA9IGNhY2hlLmRhdGEgPSB7fTtcclxuXHRcdFx0Z2MgPSBjYWNoZS5nYXJiYWdlQ29sbGVjdCA9IFtdO1xyXG5cdFx0XHRjYWNoZS5mb250ID0gZm9udDtcclxuXHRcdH1cclxuXHJcblx0XHRjdHguZm9udCA9IGZvbnQ7Ly90b2RvIOi/memHjOmcgOimgea3u+WKoHNldEZvbnRTaXplXHJcblx0XHR2YXIgbG9uZ2VzdCA9IDA7XHJcblx0XHRoZWxwZXJzLmVhY2goYXJyYXlPZlRoaW5ncywgZnVuY3Rpb24odGhpbmcpIHtcclxuXHRcdFx0Ly8gVW5kZWZpbmVkIHN0cmluZ3MgYW5kIGFycmF5cyBzaG91bGQgbm90IGJlIG1lYXN1cmVkXHJcblx0XHRcdGlmICh0aGluZyAhPT0gdW5kZWZpbmVkICYmIHRoaW5nICE9PSBudWxsICYmIGhlbHBlcnMuaXNBcnJheSh0aGluZykgIT09IHRydWUpIHtcclxuXHRcdFx0XHRsb25nZXN0ID0gaGVscGVycy5tZWFzdXJlVGV4dChjdHgsIGRhdGEsIGdjLCBsb25nZXN0LCB0aGluZyk7XHJcblx0XHRcdH0gZWxzZSBpZiAoaGVscGVycy5pc0FycmF5KHRoaW5nKSkge1xyXG5cdFx0XHRcdC8vIGlmIGl0IGlzIGFuIGFycmF5IGxldHMgbWVhc3VyZSBlYWNoIGVsZW1lbnRcclxuXHRcdFx0XHQvLyB0byBkbyBtYXliZSBzaW1wbGlmeSB0aGlzIGZ1bmN0aW9uIGEgYml0IHNvIHdlIGNhbiBkbyB0aGlzIG1vcmUgcmVjdXJzaXZlbHk/XHJcblx0XHRcdFx0aGVscGVycy5lYWNoKHRoaW5nLCBmdW5jdGlvbihuZXN0ZWRUaGluZykge1xyXG5cdFx0XHRcdFx0Ly8gVW5kZWZpbmVkIHN0cmluZ3MgYW5kIGFycmF5cyBzaG91bGQgbm90IGJlIG1lYXN1cmVkXHJcblx0XHRcdFx0XHRpZiAobmVzdGVkVGhpbmcgIT09IHVuZGVmaW5lZCAmJiBuZXN0ZWRUaGluZyAhPT0gbnVsbCAmJiAhaGVscGVycy5pc0FycmF5KG5lc3RlZFRoaW5nKSkge1xyXG5cdFx0XHRcdFx0XHRsb25nZXN0ID0gaGVscGVycy5tZWFzdXJlVGV4dChjdHgsIGRhdGEsIGdjLCBsb25nZXN0LCBuZXN0ZWRUaGluZyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHZhciBnY0xlbiA9IGdjLmxlbmd0aCAvIDI7XHJcblx0XHRpZiAoZ2NMZW4gPiBhcnJheU9mVGhpbmdzLmxlbmd0aCkge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGdjTGVuOyBpKyspIHtcclxuXHRcdFx0XHRkZWxldGUgZGF0YVtnY1tpXV07XHJcblx0XHRcdH1cclxuXHRcdFx0Z2Muc3BsaWNlKDAsIGdjTGVuKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBsb25nZXN0O1xyXG5cdH07XHJcblx0aGVscGVycy5tZWFzdXJlVGV4dCA9IGZ1bmN0aW9uKGN0eCwgZGF0YSwgZ2MsIGxvbmdlc3QsIHN0cmluZykge1xyXG5cdFx0dmFyIHRleHRXaWR0aCA9IGRhdGFbc3RyaW5nXTtcclxuXHRcdGlmICghdGV4dFdpZHRoKSB7XHJcblx0XHRcdHRleHRXaWR0aCA9IGRhdGFbc3RyaW5nXSA9IGN0eC5tZWFzdXJlVGV4dChzdHJpbmcpLndpZHRoO1xyXG5cdFx0XHRnYy5wdXNoKHN0cmluZyk7XHJcblx0XHR9XHJcblx0XHRpZiAodGV4dFdpZHRoID4gbG9uZ2VzdCkge1xyXG5cdFx0XHRsb25nZXN0ID0gdGV4dFdpZHRoO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGxvbmdlc3Q7XHJcblx0fTtcclxuXHRoZWxwZXJzLm51bWJlck9mTGFiZWxMaW5lcyA9IGZ1bmN0aW9uKGFycmF5T2ZUaGluZ3MpIHtcclxuXHRcdHZhciBudW1iZXJPZkxpbmVzID0gMTtcclxuXHRcdGhlbHBlcnMuZWFjaChhcnJheU9mVGhpbmdzLCBmdW5jdGlvbih0aGluZykge1xyXG5cdFx0XHRpZiAoaGVscGVycy5pc0FycmF5KHRoaW5nKSkge1xyXG5cdFx0XHRcdGlmICh0aGluZy5sZW5ndGggPiBudW1iZXJPZkxpbmVzKSB7XHJcblx0XHRcdFx0XHRudW1iZXJPZkxpbmVzID0gdGhpbmcubGVuZ3RoO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHRyZXR1cm4gbnVtYmVyT2ZMaW5lcztcclxuXHR9O1xyXG5cdGhlbHBlcnMuZHJhd1JvdW5kZWRSZWN0YW5nbGUgPSBmdW5jdGlvbihjdHgsIHgsIHksIHdpZHRoLCBoZWlnaHQsIHJhZGl1cykge1xyXG5cdFx0Y3R4LmJlZ2luUGF0aCgpO1xyXG5cdFx0Y3R4Lm1vdmVUbyh4ICsgcmFkaXVzLCB5KTtcclxuXHRcdGN0eC5saW5lVG8oeCArIHdpZHRoIC0gcmFkaXVzLCB5KTtcclxuXHRcdGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKHggKyB3aWR0aCwgeSwgeCArIHdpZHRoLCB5ICsgcmFkaXVzKTtcclxuXHRcdGN0eC5saW5lVG8oeCArIHdpZHRoLCB5ICsgaGVpZ2h0IC0gcmFkaXVzKTtcclxuXHRcdGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKHggKyB3aWR0aCwgeSArIGhlaWdodCwgeCArIHdpZHRoIC0gcmFkaXVzLCB5ICsgaGVpZ2h0KTtcclxuXHRcdGN0eC5saW5lVG8oeCArIHJhZGl1cywgeSArIGhlaWdodCk7XHJcblx0XHRjdHgucXVhZHJhdGljQ3VydmVUbyh4LCB5ICsgaGVpZ2h0LCB4LCB5ICsgaGVpZ2h0IC0gcmFkaXVzKTtcclxuXHRcdGN0eC5saW5lVG8oeCwgeSArIHJhZGl1cyk7XHJcblx0XHRjdHgucXVhZHJhdGljQ3VydmVUbyh4LCB5LCB4ICsgcmFkaXVzLCB5KTtcclxuXHRcdGN0eC5jbG9zZVBhdGgoKTtcclxuXHR9O1xyXG5cdGhlbHBlcnMuY29sb3IgPSBmdW5jdGlvbihjKSB7XHJcblx0XHRpZiAoIWNvbG9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0NvbG9yLmpzIG5vdCBmb3VuZCEnKTtcclxuXHRcdFx0cmV0dXJuIGM7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gLyogZ2xvYmFsIENhbnZhc0dyYWRpZW50ICovXHJcblx0XHQvLyBpZiAoYyBpbnN0YW5jZW9mIENhbnZhc0dyYWRpZW50KSB7XHJcblx0XHQvLyBcdHJldHVybiBjb2xvcihDaGFydC5kZWZhdWx0cy5nbG9iYWwuZGVmYXVsdENvbG9yKTtcclxuXHRcdC8vIH1cclxuXHJcblx0XHRyZXR1cm4gY29sb3IoYyk7XHJcblx0fTtcclxuXHRoZWxwZXJzLmFkZFJlc2l6ZUxpc3RlbmVyID0gZnVuY3Rpb24obm9kZSwgY2FsbGJhY2spIHsvL+emgeeUqOS6i+S7tlxyXG5cdFx0cmV0dXJuO1xyXG5cdFx0dmFyIGlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xyXG5cdFx0aWZyYW1lLmNsYXNzTmFtZSA9ICdjaGFydGpzLWhpZGRlbi1pZnJhbWUnO1xyXG5cdFx0aWZyYW1lLnN0eWxlLmNzc1RleHQgPVxyXG5cdFx0XHQnZGlzcGxheTpibG9jazsnK1xyXG5cdFx0XHQnb3ZlcmZsb3c6aGlkZGVuOycrXHJcblx0XHRcdCdib3JkZXI6MDsnK1xyXG5cdFx0XHQnbWFyZ2luOjA7JytcclxuXHRcdFx0J3RvcDowOycrXHJcblx0XHRcdCdsZWZ0OjA7JytcclxuXHRcdFx0J2JvdHRvbTowOycrXHJcblx0XHRcdCdyaWdodDowOycrXHJcblx0XHRcdCdoZWlnaHQ6MTAwJTsnK1xyXG5cdFx0XHQnd2lkdGg6MTAwJTsnK1xyXG5cdFx0XHQncG9zaXRpb246YWJzb2x1dGU7JytcclxuXHRcdFx0J3BvaW50ZXItZXZlbnRzOm5vbmU7JytcclxuXHRcdFx0J3otaW5kZXg6LTE7JztcclxuXHJcblx0XHQvLyBQcmV2ZW50IHRoZSBpZnJhbWUgdG8gZ2FpbiBmb2N1cyBvbiB0YWIuXHJcblx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vY2hhcnRqcy9DaGFydC5qcy9pc3N1ZXMvMzA5MFxyXG5cdFx0aWZyYW1lLnRhYkluZGV4ID0gLTE7XHJcblxyXG5cdFx0Ly8gTGV0J3Mga2VlcCB0cmFjayBvZiB0aGlzIGFkZGVkIGlmcmFtZSBhbmQgdGh1cyBhdm9pZCBET00gcXVlcnkgd2hlbiByZW1vdmluZyBpdC5cclxuXHRcdHZhciBzdHViID0gbm9kZS5fY2hhcnRqcyA9IHtcclxuXHRcdFx0cmVzaXplcjogaWZyYW1lLFxyXG5cdFx0XHR0aWNraW5nOiBmYWxzZVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBUaHJvdHRsZSB0aGUgY2FsbGJhY2sgbm90aWZpY2F0aW9uIHVudGlsIHRoZSBuZXh0IGFuaW1hdGlvbiBmcmFtZS5cclxuXHRcdHZhciBub3RpZnkgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0aWYgKCFzdHViLnRpY2tpbmcpIHtcclxuXHRcdFx0XHRzdHViLnRpY2tpbmcgPSB0cnVlO1xyXG5cdFx0XHRcdGhlbHBlcnMucmVxdWVzdEFuaW1GcmFtZS5jYWxsKHdpbmRvdywgZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRpZiAoc3R1Yi5yZXNpemVyKSB7XHJcblx0XHRcdFx0XHRcdHN0dWIudGlja2luZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBJZiB0aGUgaWZyYW1lIGlzIHJlLWF0dGFjaGVkIHRvIHRoZSBET00sIHRoZSByZXNpemUgbGlzdGVuZXIgaXMgcmVtb3ZlZCBiZWNhdXNlIHRoZVxyXG5cdFx0Ly8gY29udGVudCBpcyByZWxvYWRlZCwgc28gbWFrZSBzdXJlIHRvIGluc3RhbGwgdGhlIGhhbmRsZXIgYWZ0ZXIgdGhlIGlmcmFtZSBpcyBsb2FkZWQuXHJcblx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vY2hhcnRqcy9DaGFydC5qcy9pc3N1ZXMvMzUyMVxyXG5cdFx0aGVscGVycy5hZGRFdmVudChpZnJhbWUsICdsb2FkJywgZnVuY3Rpb24oKSB7XHJcblx0XHRcdGhlbHBlcnMuYWRkRXZlbnQoaWZyYW1lLmNvbnRlbnRXaW5kb3cgfHwgaWZyYW1lLCAncmVzaXplJywgbm90aWZ5KTtcclxuXHJcblx0XHRcdC8vIFRoZSBpZnJhbWUgc2l6ZSBtaWdodCBoYXZlIGNoYW5nZWQgd2hpbGUgbG9hZGluZywgd2hpY2ggY2FuIGFsc29cclxuXHRcdFx0Ly8gaGFwcGVuIGlmIHRoZSBzaXplIGhhcyBiZWVuIGNoYW5nZWQgd2hpbGUgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxyXG5cdFx0XHRub3RpZnkoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG5vZGUuaW5zZXJ0QmVmb3JlKGlmcmFtZSwgbm9kZS5maXJzdENoaWxkKTtcclxuXHR9O1xyXG5cdGhlbHBlcnMucmVtb3ZlUmVzaXplTGlzdGVuZXIgPSBmdW5jdGlvbihub2RlKSB7Ly/npoHnlKjkuovku7ZcclxuXHRcdHJldHVybiA7XHJcblx0XHRpZiAoIW5vZGUgfHwgIW5vZGUuX2NoYXJ0anMpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBpZnJhbWUgPSBub2RlLl9jaGFydGpzLnJlc2l6ZXI7XHJcblx0XHRpZiAoaWZyYW1lKSB7XHJcblx0XHRcdGlmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGlmcmFtZSk7XHJcblx0XHRcdG5vZGUuX2NoYXJ0anMucmVzaXplciA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0ZGVsZXRlIG5vZGUuX2NoYXJ0anM7XHJcblx0fTtcclxuXHRoZWxwZXJzLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5P1xyXG5cdFx0ZnVuY3Rpb24ob2JqKSB7XHJcblx0XHRcdHJldHVybiBBcnJheS5pc0FycmF5KG9iaik7XHJcblx0XHR9IDpcclxuXHRcdGZ1bmN0aW9uKG9iaikge1xyXG5cdFx0XHRyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XHJcblx0XHR9O1xyXG5cdC8vICEgQHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNDg1Mzk3NFxyXG5cdGhlbHBlcnMuYXJyYXlFcXVhbHMgPSBmdW5jdGlvbihhMCwgYTEpIHtcclxuXHRcdHZhciBpLCBpbGVuLCB2MCwgdjE7XHJcblxyXG5cdFx0aWYgKCFhMCB8fCAhYTEgfHwgYTAubGVuZ3RoICE9PSBhMS5sZW5ndGgpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAoaSA9IDAsIGlsZW49YTAubGVuZ3RoOyBpIDwgaWxlbjsgKytpKSB7XHJcblx0XHRcdHYwID0gYTBbaV07XHJcblx0XHRcdHYxID0gYTFbaV07XHJcblxyXG5cdFx0XHRpZiAodjAgaW5zdGFuY2VvZiBBcnJheSAmJiB2MSBpbnN0YW5jZW9mIEFycmF5KSB7XHJcblx0XHRcdFx0aWYgKCFoZWxwZXJzLmFycmF5RXF1YWxzKHYwLCB2MSkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAodjAgIT09IHYxKSB7XHJcblx0XHRcdFx0Ly8gTk9URTogdHdvIGRpZmZlcmVudCBvYmplY3QgaW5zdGFuY2VzIHdpbGwgbmV2ZXIgYmUgZXF1YWw6IHt4OjIwfSAhPSB7eDoyMH1cclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9O1xyXG5cdGhlbHBlcnMuY2FsbENhbGxiYWNrID0gZnVuY3Rpb24oZm4sIGFyZ3MsIF90QXJnKSB7XHJcblx0XHRpZiAoZm4gJiYgdHlwZW9mIGZuLmNhbGwgPT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0Zm4uYXBwbHkoX3RBcmcsIGFyZ3MpO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0aGVscGVycy5nZXRIb3ZlckNvbG9yID0gZnVuY3Rpb24oY29sb3JWYWx1ZSkge1xyXG5cdFx0LyogZ2xvYmFsIENhbnZhc1BhdHRlcm4gKi9cclxuXHRcdHJldHVybiBoZWxwZXJzLmNvbG9yKGNvbG9yVmFsdWUpLnNhdHVyYXRlKDAuNSkuZGFya2VuKDAuMSkucmdiU3RyaW5nKCk7XHJcblx0fTtcclxufTtcclxuIl19