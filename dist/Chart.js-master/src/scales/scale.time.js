/* global window: false */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var moment = require('./../../../npm/moment/moment.js');
moment = typeof moment === 'function' ? moment : window.moment;

module.exports = function (Chart) {

	var helpers = Chart.helpers;
	var time = {
		units: [{
			name: 'millisecond',
			steps: [1, 2, 5, 10, 20, 50, 100, 250, 500]
		}, {
			name: 'second',
			steps: [1, 2, 5, 10, 30]
		}, {
			name: 'minute',
			steps: [1, 2, 5, 10, 30]
		}, {
			name: 'hour',
			steps: [1, 2, 3, 6, 12]
		}, {
			name: 'day',
			steps: [1, 2, 5]
		}, {
			name: 'week',
			maxStep: 4
		}, {
			name: 'month',
			maxStep: 3
		}, {
			name: 'quarter',
			maxStep: 4
		}, {
			name: 'year',
			maxStep: false
		}]
	};

	var defaultConfig = {
		position: 'bottom',

		time: {
			parser: false, // false == a pattern string from http://momentjs.com/docs/#/parsing/string-format/ or a custom callback that converts its argument to a moment
			format: false, // DEPRECATED false == date objects, moment object, callback or a pattern string from http://momentjs.com/docs/#/parsing/string-format/
			unit: false, // false == automatic or override with week, month, year, etc.
			round: false, // none, or override with week, month, year, etc.
			displayFormat: false, // DEPRECATED
			isoWeekday: false, // override week start day - see http://momentjs.com/docs/#/get-set/iso-weekday/
			minUnit: 'millisecond',

			// defaults to unit's corresponding unitFormat below or override using pattern string from http://momentjs.com/docs/#/displaying/format/
			displayFormats: {
				millisecond: 'h:mm:ss.SSS a', // 11:20:01.123 AM,
				second: 'h:mm:ss a', // 11:20:01 AM
				minute: 'h:mm:ss a', // 11:20:01 AM
				hour: 'MMM D, hA', // Sept 4, 5PM
				day: 'll', // Sep 4 2015
				week: 'll', // Week 46, or maybe "[W]WW - YYYY" ?
				month: 'MMM YYYY', // Sept 2015
				quarter: '[Q]Q - YYYY', // Q3
				year: 'YYYY' // 2015
			}
		},
		ticks: {
			autoSkip: false
		}
	};

	var TimeScale = Chart.Scale.extend({
		initialize: function initialize() {
			if (!moment) {
				throw new Error('Chart.js - Moment.js could not be found! You must include it before Chart.js to use the time scale. Download at https://momentjs.com');
			}

			Chart.Scale.prototype.initialize.call(this);
		},
		getLabelMoment: function getLabelMoment(datasetIndex, index) {
			if (datasetIndex === null || index === null) {
				return null;
			}

			if (typeof this.labelMoments[datasetIndex] !== 'undefined') {
				return this.labelMoments[datasetIndex][index];
			}

			return null;
		},
		getLabelDiff: function getLabelDiff(datasetIndex, index) {
			var me = this;
			if (datasetIndex === null || index === null) {
				return null;
			}

			if (me.labelDiffs === undefined) {
				me.buildLabelDiffs();
			}

			if (typeof me.labelDiffs[datasetIndex] !== 'undefined') {
				return me.labelDiffs[datasetIndex][index];
			}

			return null;
		},
		getMomentStartOf: function getMomentStartOf(tick) {
			var me = this;
			if (me.options.time.unit === 'week' && me.options.time.isoWeekday !== false) {
				return tick.clone().startOf('isoWeek').isoWeekday(me.options.time.isoWeekday);
			}
			return tick.clone().startOf(me.tickUnit);
		},
		determineDataLimits: function determineDataLimits() {
			var me = this;
			me.labelMoments = [];

			// Only parse these once. If the dataset does not have data as x,y pairs, we will use
			// these
			var scaleLabelMoments = [];
			if (me.chart.data.labels && me.chart.data.labels.length > 0) {
				helpers.each(me.chart.data.labels, function (label) {
					var labelMoment = me.parseTime(label);

					if (labelMoment.isValid()) {
						if (me.options.time.round) {
							labelMoment.startOf(me.options.time.round);
						}
						scaleLabelMoments.push(labelMoment);
					}
				}, me);

				me.firstTick = moment.min.call(me, scaleLabelMoments);
				me.lastTick = moment.max.call(me, scaleLabelMoments);
			} else {
				me.firstTick = null;
				me.lastTick = null;
			}

			helpers.each(me.chart.data.datasets, function (dataset, datasetIndex) {
				var momentsForDataset = [];
				var datasetVisible = me.chart.isDatasetVisible(datasetIndex);

				if (_typeof(dataset.data[0]) === 'object' && dataset.data[0] !== null) {
					helpers.each(dataset.data, function (value) {
						var labelMoment = me.parseTime(me.getRightValue(value));

						if (labelMoment.isValid()) {
							if (me.options.time.round) {
								labelMoment.startOf(me.options.time.round);
							}
							momentsForDataset.push(labelMoment);

							if (datasetVisible) {
								// May have gone outside the scale ranges, make sure we keep the first and last ticks updated
								me.firstTick = me.firstTick !== null ? moment.min(me.firstTick, labelMoment) : labelMoment;
								me.lastTick = me.lastTick !== null ? moment.max(me.lastTick, labelMoment) : labelMoment;
							}
						}
					}, me);
				} else {
					// We have no labels. Use the ones from the scale
					momentsForDataset = scaleLabelMoments;
				}

				me.labelMoments.push(momentsForDataset);
			}, me);

			// Set these after we've done all the data
			if (me.options.time.min) {
				me.firstTick = me.parseTime(me.options.time.min);
			}

			if (me.options.time.max) {
				me.lastTick = me.parseTime(me.options.time.max);
			}

			// We will modify these, so clone for later
			me.firstTick = (me.firstTick || moment()).clone();
			me.lastTick = (me.lastTick || moment()).clone();
		},
		buildLabelDiffs: function buildLabelDiffs() {
			var me = this;
			me.labelDiffs = [];
			var scaleLabelDiffs = [];
			// Parse common labels once
			if (me.chart.data.labels && me.chart.data.labels.length > 0) {
				helpers.each(me.chart.data.labels, function (label) {
					var labelMoment = me.parseTime(label);

					if (labelMoment.isValid()) {
						if (me.options.time.round) {
							labelMoment.startOf(me.options.time.round);
						}
						scaleLabelDiffs.push(labelMoment.diff(me.firstTick, me.tickUnit, true));
					}
				}, me);
			}

			helpers.each(me.chart.data.datasets, function (dataset) {
				var diffsForDataset = [];

				if (_typeof(dataset.data[0]) === 'object' && dataset.data[0] !== null) {
					helpers.each(dataset.data, function (value) {
						var labelMoment = me.parseTime(me.getRightValue(value));

						if (labelMoment.isValid()) {
							if (me.options.time.round) {
								labelMoment.startOf(me.options.time.round);
							}
							diffsForDataset.push(labelMoment.diff(me.firstTick, me.tickUnit, true));
						}
					}, me);
				} else {
					// We have no labels. Use common ones
					diffsForDataset = scaleLabelDiffs;
				}

				me.labelDiffs.push(diffsForDataset);
			}, me);
		},
		buildTicks: function buildTicks() {
			var me = this;

			me.ctx.save();
			var tickFontSize = helpers.getValueOrDefault(me.options.ticks.fontSize, Chart.defaults.global.defaultFontSize);
			var tickFontStyle = helpers.getValueOrDefault(me.options.ticks.fontStyle, Chart.defaults.global.defaultFontStyle);
			var tickFontFamily = helpers.getValueOrDefault(me.options.ticks.fontFamily, Chart.defaults.global.defaultFontFamily);
			var tickLabelFont = helpers.fontString(tickFontSize, tickFontStyle, tickFontFamily);
			me.ctx.font = tickLabelFont;
			me.ctx.setFontSize(tickFontSize);

			me.ticks = [];
			me.unitScale = 1; // How much we scale the unit by, ie 2 means 2x unit per step
			me.scaleSizeInUnits = 0; // How large the scale is in the base unit (seconds, minutes, etc)

			// Set unit override if applicable
			if (me.options.time.unit) {
				me.tickUnit = me.options.time.unit || 'day';
				me.displayFormat = me.options.time.displayFormats[me.tickUnit];
				me.scaleSizeInUnits = me.lastTick.diff(me.firstTick, me.tickUnit, true);
				me.unitScale = helpers.getValueOrDefault(me.options.time.unitStepSize, 1);
			} else {
				// Determine the smallest needed unit of the time
				var innerWidth = me.isHorizontal() ? me.width - (me.paddingLeft + me.paddingRight) : me.height - (me.paddingTop + me.paddingBottom);

				// Crude approximation of what the label length might be
				var tempFirstLabel = me.tickFormatFunction(me.firstTick, 0, []);
				var tickLabelWidth = me.ctx.measureText(tempFirstLabel).width;
				var cosRotation = Math.cos(helpers.toRadians(me.options.ticks.maxRotation));
				var sinRotation = Math.sin(helpers.toRadians(me.options.ticks.maxRotation));
				tickLabelWidth = tickLabelWidth * cosRotation + tickFontSize * sinRotation;
				var labelCapacity = innerWidth / tickLabelWidth;

				// Start as small as possible
				me.tickUnit = me.options.time.minUnit;
				me.scaleSizeInUnits = me.lastTick.diff(me.firstTick, me.tickUnit, true);
				me.displayFormat = me.options.time.displayFormats[me.tickUnit];

				var unitDefinitionIndex = 0;
				var unitDefinition = time.units[unitDefinitionIndex];

				// While we aren't ideal and we don't have units left
				while (unitDefinitionIndex < time.units.length) {
					// Can we scale this unit. If `false` we can scale infinitely
					me.unitScale = 1;

					if (helpers.isArray(unitDefinition.steps) && Math.ceil(me.scaleSizeInUnits / labelCapacity) < helpers.max(unitDefinition.steps)) {
						// Use one of the predefined steps
						for (var idx = 0; idx < unitDefinition.steps.length; ++idx) {
							if (unitDefinition.steps[idx] >= Math.ceil(me.scaleSizeInUnits / labelCapacity)) {
								me.unitScale = helpers.getValueOrDefault(me.options.time.unitStepSize, unitDefinition.steps[idx]);
								break;
							}
						}

						break;
					} else if (unitDefinition.maxStep === false || Math.ceil(me.scaleSizeInUnits / labelCapacity) < unitDefinition.maxStep) {
						// We have a max step. Scale this unit
						me.unitScale = helpers.getValueOrDefault(me.options.time.unitStepSize, Math.ceil(me.scaleSizeInUnits / labelCapacity));
						break;
					} else {
						// Move to the next unit up
						++unitDefinitionIndex;
						unitDefinition = time.units[unitDefinitionIndex];

						me.tickUnit = unitDefinition.name;
						var leadingUnitBuffer = me.firstTick.diff(me.getMomentStartOf(me.firstTick), me.tickUnit, true);
						var trailingUnitBuffer = me.getMomentStartOf(me.lastTick.clone().add(1, me.tickUnit)).diff(me.lastTick, me.tickUnit, true);
						me.scaleSizeInUnits = me.lastTick.diff(me.firstTick, me.tickUnit, true) + leadingUnitBuffer + trailingUnitBuffer;
						me.displayFormat = me.options.time.displayFormats[unitDefinition.name];
					}
				}
			}

			var roundedStart;

			// Only round the first tick if we have no hard minimum
			if (!me.options.time.min) {
				me.firstTick = me.getMomentStartOf(me.firstTick);
				roundedStart = me.firstTick;
			} else {
				roundedStart = me.getMomentStartOf(me.firstTick);
			}

			// Only round the last tick if we have no hard maximum
			if (!me.options.time.max) {
				var roundedEnd = me.getMomentStartOf(me.lastTick);
				var delta = roundedEnd.diff(me.lastTick, me.tickUnit, true);
				if (delta < 0) {
					// Do not use end of because we need me to be in the next time unit
					me.lastTick = me.getMomentStartOf(me.lastTick.add(1, me.tickUnit));
				} else if (delta >= 0) {
					me.lastTick = roundedEnd;
				}

				me.scaleSizeInUnits = me.lastTick.diff(me.firstTick, me.tickUnit, true);
			}

			// Tick displayFormat override
			if (me.options.time.displayFormat) {
				me.displayFormat = me.options.time.displayFormat;
			}

			// first tick. will have been rounded correctly if options.time.min is not specified
			me.ticks.push(me.firstTick.clone());

			// For every unit in between the first and last moment, create a moment and add it to the ticks tick
			for (var i = 1; i <= me.scaleSizeInUnits; ++i) {
				var newTick = roundedStart.clone().add(i, me.tickUnit);

				// Are we greater than the max time
				if (me.options.time.max && newTick.diff(me.lastTick, me.tickUnit, true) >= 0) {
					break;
				}

				if (i % me.unitScale === 0) {
					me.ticks.push(newTick);
				}
			}

			// Always show the right tick
			var diff = me.ticks[me.ticks.length - 1].diff(me.lastTick, me.tickUnit);
			if (diff !== 0 || me.scaleSizeInUnits === 0) {
				// this is a weird case. If the <max> option is the same as the end option, we can't just diff the times because the tick was created from the roundedStart
				// but the last tick was not rounded.
				if (me.options.time.max) {
					me.ticks.push(me.lastTick.clone());
					me.scaleSizeInUnits = me.lastTick.diff(me.ticks[0], me.tickUnit, true);
				} else {
					me.ticks.push(me.lastTick.clone());
					me.scaleSizeInUnits = me.lastTick.diff(me.firstTick, me.tickUnit, true);
				}
			}

			me.ctx.restore();

			// Invalidate label diffs cache
			me.labelDiffs = undefined;
		},
		// Get tooltip label
		getLabelForIndex: function getLabelForIndex(index, datasetIndex) {
			var me = this;
			var label = me.chart.data.labels && index < me.chart.data.labels.length ? me.chart.data.labels[index] : '';

			if (_typeof(me.chart.data.datasets[datasetIndex].data[0]) === 'object') {
				label = me.getRightValue(me.chart.data.datasets[datasetIndex].data[index]);
			}

			// Format nicely
			if (me.options.time.tooltipFormat) {
				label = me.parseTime(label).format(me.options.time.tooltipFormat);
			}

			return label;
		},
		// Function to format an individual tick mark
		tickFormatFunction: function tickFormatFunction(tick, index, ticks) {
			var formattedTick = tick.format(this.displayFormat);
			var tickOpts = this.options.ticks;
			var callback = helpers.getValueOrDefault(tickOpts.callback, tickOpts.userCallback);

			if (callback) {
				return callback(formattedTick, index, ticks);
			}
			return formattedTick;
		},
		convertTicksToLabels: function convertTicksToLabels() {
			var me = this;
			me.tickMoments = me.ticks;
			me.ticks = me.ticks.map(me.tickFormatFunction, me);
		},
		getPixelForValue: function getPixelForValue(value, index, datasetIndex) {
			var me = this;
			var offset = null;
			if (index !== undefined && datasetIndex !== undefined) {
				offset = me.getLabelDiff(datasetIndex, index);
			}

			if (offset === null) {
				if (!value || !value.isValid) {
					// not already a moment object
					value = me.parseTime(me.getRightValue(value));
				}
				if (value && value.isValid && value.isValid()) {
					offset = value.diff(me.firstTick, me.tickUnit, true);
				}
			}

			if (offset !== null) {
				var decimal = offset !== 0 ? offset / me.scaleSizeInUnits : offset;

				if (me.isHorizontal()) {
					var innerWidth = me.width - (me.paddingLeft + me.paddingRight);
					var valueOffset = innerWidth * decimal + me.paddingLeft;

					return me.left + Math.round(valueOffset);
				}
				var innerHeight = me.height - (me.paddingTop + me.paddingBottom);
				var heightOffset = innerHeight * decimal + me.paddingTop;

				return me.top + Math.round(heightOffset);
			}
		},
		getPixelForTick: function getPixelForTick(index) {
			return this.getPixelForValue(this.tickMoments[index], null, null);
		},
		getValueForPixel: function getValueForPixel(pixel) {
			var me = this;
			var innerDimension = me.isHorizontal() ? me.width - (me.paddingLeft + me.paddingRight) : me.height - (me.paddingTop + me.paddingBottom);
			var offset = (pixel - (me.isHorizontal() ? me.left + me.paddingLeft : me.top + me.paddingTop)) / innerDimension;
			offset *= me.scaleSizeInUnits;
			return me.firstTick.clone().add(moment.duration(offset, me.tickUnit).asSeconds(), 'seconds');
		},
		parseTime: function parseTime(label) {
			var me = this;
			if (typeof me.options.time.parser === 'string') {
				return moment(label, me.options.time.parser);
			}
			if (typeof me.options.time.parser === 'function') {
				return me.options.time.parser(label);
			}
			// Date objects
			if (typeof label.getMonth === 'function' || typeof label === 'number') {
				return moment(label);
			}
			// Moment support
			if (label.isValid && label.isValid()) {
				return label;
			}
			// Custom parsing (return an instance of moment)
			if (typeof me.options.time.format !== 'string' && me.options.time.format.call) {
				console.warn('options.time.format is deprecated and replaced by options.time.parser. See http://nnnick.github.io/Chart.js/docs-v2/#scales-time-scale');
				return me.options.time.format(label);
			}
			// Moment format parsing
			return moment(label, me.options.time.format);
		}
	});
	Chart.scaleService.registerScaleType('time', TimeScale, defaultConfig);
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjYWxlLnRpbWUuanMiXSwibmFtZXMiOlsibW9tZW50IiwicmVxdWlyZSIsIndpbmRvdyIsIm1vZHVsZSIsImV4cG9ydHMiLCJDaGFydCIsImhlbHBlcnMiLCJ0aW1lIiwidW5pdHMiLCJuYW1lIiwic3RlcHMiLCJtYXhTdGVwIiwiZGVmYXVsdENvbmZpZyIsInBvc2l0aW9uIiwicGFyc2VyIiwiZm9ybWF0IiwidW5pdCIsInJvdW5kIiwiZGlzcGxheUZvcm1hdCIsImlzb1dlZWtkYXkiLCJtaW5Vbml0IiwiZGlzcGxheUZvcm1hdHMiLCJtaWxsaXNlY29uZCIsInNlY29uZCIsIm1pbnV0ZSIsImhvdXIiLCJkYXkiLCJ3ZWVrIiwibW9udGgiLCJxdWFydGVyIiwieWVhciIsInRpY2tzIiwiYXV0b1NraXAiLCJUaW1lU2NhbGUiLCJTY2FsZSIsImV4dGVuZCIsImluaXRpYWxpemUiLCJFcnJvciIsInByb3RvdHlwZSIsImNhbGwiLCJnZXRMYWJlbE1vbWVudCIsImRhdGFzZXRJbmRleCIsImluZGV4IiwibGFiZWxNb21lbnRzIiwiZ2V0TGFiZWxEaWZmIiwibWUiLCJsYWJlbERpZmZzIiwidW5kZWZpbmVkIiwiYnVpbGRMYWJlbERpZmZzIiwiZ2V0TW9tZW50U3RhcnRPZiIsInRpY2siLCJvcHRpb25zIiwiY2xvbmUiLCJzdGFydE9mIiwidGlja1VuaXQiLCJkZXRlcm1pbmVEYXRhTGltaXRzIiwic2NhbGVMYWJlbE1vbWVudHMiLCJjaGFydCIsImRhdGEiLCJsYWJlbHMiLCJsZW5ndGgiLCJlYWNoIiwibGFiZWwiLCJsYWJlbE1vbWVudCIsInBhcnNlVGltZSIsImlzVmFsaWQiLCJwdXNoIiwiZmlyc3RUaWNrIiwibWluIiwibGFzdFRpY2siLCJtYXgiLCJkYXRhc2V0cyIsImRhdGFzZXQiLCJtb21lbnRzRm9yRGF0YXNldCIsImRhdGFzZXRWaXNpYmxlIiwiaXNEYXRhc2V0VmlzaWJsZSIsInZhbHVlIiwiZ2V0UmlnaHRWYWx1ZSIsInNjYWxlTGFiZWxEaWZmcyIsImRpZmYiLCJkaWZmc0ZvckRhdGFzZXQiLCJidWlsZFRpY2tzIiwiY3R4Iiwic2F2ZSIsInRpY2tGb250U2l6ZSIsImdldFZhbHVlT3JEZWZhdWx0IiwiZm9udFNpemUiLCJkZWZhdWx0cyIsImdsb2JhbCIsImRlZmF1bHRGb250U2l6ZSIsInRpY2tGb250U3R5bGUiLCJmb250U3R5bGUiLCJkZWZhdWx0Rm9udFN0eWxlIiwidGlja0ZvbnRGYW1pbHkiLCJmb250RmFtaWx5IiwiZGVmYXVsdEZvbnRGYW1pbHkiLCJ0aWNrTGFiZWxGb250IiwiZm9udFN0cmluZyIsImZvbnQiLCJzZXRGb250U2l6ZSIsInVuaXRTY2FsZSIsInNjYWxlU2l6ZUluVW5pdHMiLCJ1bml0U3RlcFNpemUiLCJpbm5lcldpZHRoIiwiaXNIb3Jpem9udGFsIiwid2lkdGgiLCJwYWRkaW5nTGVmdCIsInBhZGRpbmdSaWdodCIsImhlaWdodCIsInBhZGRpbmdUb3AiLCJwYWRkaW5nQm90dG9tIiwidGVtcEZpcnN0TGFiZWwiLCJ0aWNrRm9ybWF0RnVuY3Rpb24iLCJ0aWNrTGFiZWxXaWR0aCIsIm1lYXN1cmVUZXh0IiwiY29zUm90YXRpb24iLCJNYXRoIiwiY29zIiwidG9SYWRpYW5zIiwibWF4Um90YXRpb24iLCJzaW5Sb3RhdGlvbiIsInNpbiIsImxhYmVsQ2FwYWNpdHkiLCJ1bml0RGVmaW5pdGlvbkluZGV4IiwidW5pdERlZmluaXRpb24iLCJpc0FycmF5IiwiY2VpbCIsImlkeCIsImxlYWRpbmdVbml0QnVmZmVyIiwidHJhaWxpbmdVbml0QnVmZmVyIiwiYWRkIiwicm91bmRlZFN0YXJ0Iiwicm91bmRlZEVuZCIsImRlbHRhIiwiaSIsIm5ld1RpY2siLCJyZXN0b3JlIiwiZ2V0TGFiZWxGb3JJbmRleCIsInRvb2x0aXBGb3JtYXQiLCJmb3JtYXR0ZWRUaWNrIiwidGlja09wdHMiLCJjYWxsYmFjayIsInVzZXJDYWxsYmFjayIsImNvbnZlcnRUaWNrc1RvTGFiZWxzIiwidGlja01vbWVudHMiLCJtYXAiLCJnZXRQaXhlbEZvclZhbHVlIiwib2Zmc2V0IiwiZGVjaW1hbCIsInZhbHVlT2Zmc2V0IiwibGVmdCIsImlubmVySGVpZ2h0IiwiaGVpZ2h0T2Zmc2V0IiwidG9wIiwiZ2V0UGl4ZWxGb3JUaWNrIiwiZ2V0VmFsdWVGb3JQaXhlbCIsInBpeGVsIiwiaW5uZXJEaW1lbnNpb24iLCJkdXJhdGlvbiIsImFzU2Vjb25kcyIsImdldE1vbnRoIiwiY29uc29sZSIsIndhcm4iLCJzY2FsZVNlcnZpY2UiLCJyZWdpc3RlclNjYWxlVHlwZSJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTs7OztBQUVBLElBQUlBLFNBQVNDLFFBQVEsUUFBUixDQUFiO0FBQ0FELFNBQVMsT0FBT0EsTUFBUCxLQUFtQixVQUFuQixHQUFnQ0EsTUFBaEMsR0FBeUNFLE9BQU9GLE1BQXpEOztBQUVBRyxPQUFPQyxPQUFQLEdBQWlCLFVBQVNDLEtBQVQsRUFBZ0I7O0FBRWhDLEtBQUlDLFVBQVVELE1BQU1DLE9BQXBCO0FBQ0EsS0FBSUMsT0FBTztBQUNWQyxTQUFPLENBQUM7QUFDUEMsU0FBTSxhQURDO0FBRVBDLFVBQU8sQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsRUFBVSxFQUFWLEVBQWMsRUFBZCxFQUFrQixFQUFsQixFQUFzQixHQUF0QixFQUEyQixHQUEzQixFQUFnQyxHQUFoQztBQUZBLEdBQUQsRUFHSjtBQUNGRCxTQUFNLFFBREo7QUFFRkMsVUFBTyxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLEVBQVYsRUFBYyxFQUFkO0FBRkwsR0FISSxFQU1KO0FBQ0ZELFNBQU0sUUFESjtBQUVGQyxVQUFPLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLEVBQVUsRUFBVixFQUFjLEVBQWQ7QUFGTCxHQU5JLEVBU0o7QUFDRkQsU0FBTSxNQURKO0FBRUZDLFVBQU8sQ0FBQyxDQUFELEVBQUksQ0FBSixFQUFPLENBQVAsRUFBVSxDQUFWLEVBQWEsRUFBYjtBQUZMLEdBVEksRUFZSjtBQUNGRCxTQUFNLEtBREo7QUFF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QW1CQyxpQkFBbkIsQ0FBcUMsTUFBckMsRUFBNkNuSSxTQUE3QyxFQUF3RHJCLGFBQXhEO0FBRUEsQ0F0Y0QiLCJmaWxlIjoic2NhbGUudGltZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKTtcclxubW9tZW50ID0gdHlwZW9mKG1vbWVudCkgPT09ICdmdW5jdGlvbicgPyBtb21lbnQgOiB3aW5kb3cubW9tZW50O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDaGFydCkge1xyXG5cclxuXHR2YXIgaGVscGVycyA9IENoYXJ0LmhlbHBlcnM7XHJcblx0dmFyIHRpbWUgPSB7XHJcblx0XHR1bml0czogW3tcclxuXHRcdFx0bmFtZTogJ21pbGxpc2Vjb25kJyxcclxuXHRcdFx0c3RlcHM6IFsxLCAyLCA1LCAxMCwgMjAsIDUwLCAxMDAsIDI1MCwgNTAwXVxyXG5cdFx0fSwge1xyXG5cdFx0XHRuYW1lOiAnc2Vjb25kJyxcclxuXHRcdFx0c3RlcHM6IFsxLCAyLCA1LCAxMCwgMzBdXHJcblx0XHR9LCB7XHJcblx0XHRcdG5hbWU6ICdtaW51dGUnLFxyXG5cdFx0XHRzdGVwczogWzEsIDIsIDUsIDEwLCAzMF1cclxuXHRcdH0sIHtcclxuXHRcdFx0bmFtZTogJ2hvdXInLFxyXG5cdFx0XHRzdGVwczogWzEsIDIsIDMsIDYsIDEyXVxyXG5cdFx0fSwge1xyXG5cdFx0XHRuYW1lOiAnZGF5JyxcclxuXHRcdFx0c3RlcHM6IFsxLCAyLCA1XVxyXG5cdFx0fSwge1xyXG5cdFx0XHRuYW1lOiAnd2VlaycsXHJcblx0XHRcdG1heFN0ZXA6IDRcclxuXHRcdH0sIHtcclxuXHRcdFx0bmFtZTogJ21vbnRoJyxcclxuXHRcdFx0bWF4U3RlcDogM1xyXG5cdFx0fSwge1xyXG5cdFx0XHRuYW1lOiAncXVhcnRlcicsXHJcblx0XHRcdG1heFN0ZXA6IDRcclxuXHRcdH0sIHtcclxuXHRcdFx0bmFtZTogJ3llYXInLFxyXG5cdFx0XHRtYXhTdGVwOiBmYWxzZVxyXG5cdFx0fV1cclxuXHR9O1xyXG5cclxuXHR2YXIgZGVmYXVsdENvbmZpZyA9IHtcclxuXHRcdHBvc2l0aW9uOiAnYm90dG9tJyxcclxuXHJcblx0XHR0aW1lOiB7XHJcblx0XHRcdHBhcnNlcjogZmFsc2UsIC8vIGZhbHNlID09IGEgcGF0dGVybiBzdHJpbmcgZnJvbSBodHRwOi8vbW9tZW50anMuY29tL2RvY3MvIy9wYXJzaW5nL3N0cmluZy1mb3JtYXQvIG9yIGEgY3VzdG9tIGNhbGxiYWNrIHRoYXQgY29udmVydHMgaXRzIGFyZ3VtZW50IHRvIGEgbW9tZW50XHJcblx0XHRcdGZvcm1hdDogZmFsc2UsIC8vIERFUFJFQ0FURUQgZmFsc2UgPT0gZGF0ZSBvYmplY3RzLCBtb21lbnQgb2JqZWN0LCBjYWxsYmFjayBvciBhIHBhdHRlcm4gc3RyaW5nIGZyb20gaHR0cDovL21vbWVudGpzLmNvbS9kb2NzLyMvcGFyc2luZy9zdHJpbmctZm9ybWF0L1xyXG5cdFx0XHR1bml0OiBmYWxzZSwgLy8gZmFsc2UgPT0gYXV0b21hdGljIG9yIG92ZXJyaWRlIHdpdGggd2VlaywgbW9udGgsIHllYXIsIGV0Yy5cclxuXHRcdFx0cm91bmQ6IGZhbHNlLCAvLyBub25lLCBvciBvdmVycmlkZSB3aXRoIHdlZWssIG1vbnRoLCB5ZWFyLCBldGMuXHJcblx0XHRcdGRpc3BsYXlGb3JtYXQ6IGZhbHNlLCAvLyBERVBSRUNBVEVEXHJcblx0XHRcdGlzb1dlZWtkYXk6IGZhbHNlLCAvLyBvdmVycmlkZSB3ZWVrIHN0YXJ0IGRheSAtIHNlZSBodHRwOi8vbW9tZW50anMuY29tL2RvY3MvIy9nZXQtc2V0L2lzby13ZWVrZGF5L1xyXG5cdFx0XHRtaW5Vbml0OiAnbWlsbGlzZWNvbmQnLFxyXG5cclxuXHRcdFx0Ly8gZGVmYXVsdHMgdG8gdW5pdCdzIGNvcnJlc3BvbmRpbmcgdW5pdEZvcm1hdCBiZWxvdyBvciBvdmVycmlkZSB1c2luZyBwYXR0ZXJuIHN0cmluZyBmcm9tIGh0dHA6Ly9tb21lbnRqcy5jb20vZG9jcy8jL2Rpc3BsYXlpbmcvZm9ybWF0L1xyXG5cdFx0XHRkaXNwbGF5Rm9ybWF0czoge1xyXG5cdFx0XHRcdG1pbGxpc2Vjb25kOiAnaDptbTpzcy5TU1MgYScsIC8vIDExOjIwOjAxLjEyMyBBTSxcclxuXHRcdFx0XHRzZWNvbmQ6ICdoOm1tOnNzIGEnLCAvLyAxMToyMDowMSBBTVxyXG5cdFx0XHRcdG1pbnV0ZTogJ2g6bW06c3MgYScsIC8vIDExOjIwOjAxIEFNXHJcblx0XHRcdFx0aG91cjogJ01NTSBELCBoQScsIC8vIFNlcHQgNCwgNVBNXHJcblx0XHRcdFx0ZGF5OiAnbGwnLCAvLyBTZXAgNCAyMDE1XHJcblx0XHRcdFx0d2VlazogJ2xsJywgLy8gV2VlayA0Niwgb3IgbWF5YmUgXCJbV11XVyAtIFlZWVlcIiA/XHJcblx0XHRcdFx0bW9udGg6ICdNTU0gWVlZWScsIC8vIFNlcHQgMjAxNVxyXG5cdFx0XHRcdHF1YXJ0ZXI6ICdbUV1RIC0gWVlZWScsIC8vIFEzXHJcblx0XHRcdFx0eWVhcjogJ1lZWVknIC8vIDIwMTVcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdHRpY2tzOiB7XHJcblx0XHRcdGF1dG9Ta2lwOiBmYWxzZVxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHZhciBUaW1lU2NhbGUgPSBDaGFydC5TY2FsZS5leHRlbmQoe1xyXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdGlmICghbW9tZW50KSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdDaGFydC5qcyAtIE1vbWVudC5qcyBjb3VsZCBub3QgYmUgZm91bmQhIFlvdSBtdXN0IGluY2x1ZGUgaXQgYmVmb3JlIENoYXJ0LmpzIHRvIHVzZSB0aGUgdGltZSBzY2FsZS4gRG93bmxvYWQgYXQgaHR0cHM6Ly9tb21lbnRqcy5jb20nKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Q2hhcnQuU2NhbGUucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzKTtcclxuXHRcdH0sXHJcblx0XHRnZXRMYWJlbE1vbWVudDogZnVuY3Rpb24oZGF0YXNldEluZGV4LCBpbmRleCkge1xyXG5cdFx0XHRpZiAoZGF0YXNldEluZGV4ID09PSBudWxsIHx8IGluZGV4ID09PSBudWxsKSB7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0eXBlb2YgdGhpcy5sYWJlbE1vbWVudHNbZGF0YXNldEluZGV4XSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5sYWJlbE1vbWVudHNbZGF0YXNldEluZGV4XVtpbmRleF07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fSxcclxuXHRcdGdldExhYmVsRGlmZjogZnVuY3Rpb24oZGF0YXNldEluZGV4LCBpbmRleCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHRpZiAoZGF0YXNldEluZGV4ID09PSBudWxsIHx8IGluZGV4ID09PSBudWxsKSB7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChtZS5sYWJlbERpZmZzID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRtZS5idWlsZExhYmVsRGlmZnMoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHR5cGVvZiBtZS5sYWJlbERpZmZzW2RhdGFzZXRJbmRleF0gIT09ICd1bmRlZmluZWQnKSB7XHJcblx0XHRcdFx0cmV0dXJuIG1lLmxhYmVsRGlmZnNbZGF0YXNldEluZGV4XVtpbmRleF07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fSxcclxuXHRcdGdldE1vbWVudFN0YXJ0T2Y6IGZ1bmN0aW9uKHRpY2spIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0aWYgKG1lLm9wdGlvbnMudGltZS51bml0ID09PSAnd2VlaycgJiYgbWUub3B0aW9ucy50aW1lLmlzb1dlZWtkYXkgIT09IGZhbHNlKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRpY2suY2xvbmUoKS5zdGFydE9mKCdpc29XZWVrJykuaXNvV2Vla2RheShtZS5vcHRpb25zLnRpbWUuaXNvV2Vla2RheSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRpY2suY2xvbmUoKS5zdGFydE9mKG1lLnRpY2tVbml0KTtcclxuXHRcdH0sXHJcblx0XHRkZXRlcm1pbmVEYXRhTGltaXRzOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0bWUubGFiZWxNb21lbnRzID0gW107XHJcblxyXG5cdFx0XHQvLyBPbmx5IHBhcnNlIHRoZXNlIG9uY2UuIElmIHRoZSBkYXRhc2V0IGRvZXMgbm90IGhhdmUgZGF0YSBhcyB4LHkgcGFpcnMsIHdlIHdpbGwgdXNlXHJcblx0XHRcdC8vIHRoZXNlXHJcblx0XHRcdHZhciBzY2FsZUxhYmVsTW9tZW50cyA9IFtdO1xyXG5cdFx0XHRpZiAobWUuY2hhcnQuZGF0YS5sYWJlbHMgJiYgbWUuY2hhcnQuZGF0YS5sYWJlbHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGhlbHBlcnMuZWFjaChtZS5jaGFydC5kYXRhLmxhYmVscywgZnVuY3Rpb24obGFiZWwpIHtcclxuXHRcdFx0XHRcdHZhciBsYWJlbE1vbWVudCA9IG1lLnBhcnNlVGltZShsYWJlbCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGxhYmVsTW9tZW50LmlzVmFsaWQoKSkge1xyXG5cdFx0XHRcdFx0XHRpZiAobWUub3B0aW9ucy50aW1lLnJvdW5kKSB7XHJcblx0XHRcdFx0XHRcdFx0bGFiZWxNb21lbnQuc3RhcnRPZihtZS5vcHRpb25zLnRpbWUucm91bmQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHNjYWxlTGFiZWxNb21lbnRzLnB1c2gobGFiZWxNb21lbnQpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sIG1lKTtcclxuXHJcblx0XHRcdFx0bWUuZmlyc3RUaWNrID0gbW9tZW50Lm1pbi5jYWxsKG1lLCBzY2FsZUxhYmVsTW9tZW50cyk7XHJcblx0XHRcdFx0bWUubGFzdFRpY2sgPSBtb21lbnQubWF4LmNhbGwobWUsIHNjYWxlTGFiZWxNb21lbnRzKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRtZS5maXJzdFRpY2sgPSBudWxsO1xyXG5cdFx0XHRcdG1lLmxhc3RUaWNrID0gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aGVscGVycy5lYWNoKG1lLmNoYXJ0LmRhdGEuZGF0YXNldHMsIGZ1bmN0aW9uKGRhdGFzZXQsIGRhdGFzZXRJbmRleCkge1xyXG5cdFx0XHRcdHZhciBtb21lbnRzRm9yRGF0YXNldCA9IFtdO1xyXG5cdFx0XHRcdHZhciBkYXRhc2V0VmlzaWJsZSA9IG1lLmNoYXJ0LmlzRGF0YXNldFZpc2libGUoZGF0YXNldEluZGV4KTtcclxuXHJcblx0XHRcdFx0aWYgKHR5cGVvZiBkYXRhc2V0LmRhdGFbMF0gPT09ICdvYmplY3QnICYmIGRhdGFzZXQuZGF0YVswXSAhPT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0aGVscGVycy5lYWNoKGRhdGFzZXQuZGF0YSwgZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0dmFyIGxhYmVsTW9tZW50ID0gbWUucGFyc2VUaW1lKG1lLmdldFJpZ2h0VmFsdWUodmFsdWUpKTtcclxuXHJcblx0XHRcdFx0XHRcdGlmIChsYWJlbE1vbWVudC5pc1ZhbGlkKCkpIHtcclxuXHRcdFx0XHRcdFx0XHRpZiAobWUub3B0aW9ucy50aW1lLnJvdW5kKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRsYWJlbE1vbWVudC5zdGFydE9mKG1lLm9wdGlvbnMudGltZS5yb3VuZCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdG1vbWVudHNGb3JEYXRhc2V0LnB1c2gobGFiZWxNb21lbnQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRpZiAoZGF0YXNldFZpc2libGUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIE1heSBoYXZlIGdvbmUgb3V0c2lkZSB0aGUgc2NhbGUgcmFuZ2VzLCBtYWtlIHN1cmUgd2Uga2VlcCB0aGUgZmlyc3QgYW5kIGxhc3QgdGlja3MgdXBkYXRlZFxyXG5cdFx0XHRcdFx0XHRcdFx0bWUuZmlyc3RUaWNrID0gbWUuZmlyc3RUaWNrICE9PSBudWxsID8gbW9tZW50Lm1pbihtZS5maXJzdFRpY2ssIGxhYmVsTW9tZW50KSA6IGxhYmVsTW9tZW50O1xyXG5cdFx0XHRcdFx0XHRcdFx0bWUubGFzdFRpY2sgPSBtZS5sYXN0VGljayAhPT0gbnVsbCA/IG1vbWVudC5tYXgobWUubGFzdFRpY2ssIGxhYmVsTW9tZW50KSA6IGxhYmVsTW9tZW50O1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSwgbWUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBXZSBoYXZlIG5vIGxhYmVscy4gVXNlIHRoZSBvbmVzIGZyb20gdGhlIHNjYWxlXHJcblx0XHRcdFx0XHRtb21lbnRzRm9yRGF0YXNldCA9IHNjYWxlTGFiZWxNb21lbnRzO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0bWUubGFiZWxNb21lbnRzLnB1c2gobW9tZW50c0ZvckRhdGFzZXQpO1xyXG5cdFx0XHR9LCBtZSk7XHJcblxyXG5cdFx0XHQvLyBTZXQgdGhlc2UgYWZ0ZXIgd2UndmUgZG9uZSBhbGwgdGhlIGRhdGFcclxuXHRcdFx0aWYgKG1lLm9wdGlvbnMudGltZS5taW4pIHtcclxuXHRcdFx0XHRtZS5maXJzdFRpY2sgPSBtZS5wYXJzZVRpbWUobWUub3B0aW9ucy50aW1lLm1pbik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChtZS5vcHRpb25zLnRpbWUubWF4KSB7XHJcblx0XHRcdFx0bWUubGFzdFRpY2sgPSBtZS5wYXJzZVRpbWUobWUub3B0aW9ucy50aW1lLm1heCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFdlIHdpbGwgbW9kaWZ5IHRoZXNlLCBzbyBjbG9uZSBmb3IgbGF0ZXJcclxuXHRcdFx0bWUuZmlyc3RUaWNrID0gKG1lLmZpcnN0VGljayB8fCBtb21lbnQoKSkuY2xvbmUoKTtcclxuXHRcdFx0bWUubGFzdFRpY2sgPSAobWUubGFzdFRpY2sgfHwgbW9tZW50KCkpLmNsb25lKCk7XHJcblx0XHR9LFxyXG5cdFx0YnVpbGRMYWJlbERpZmZzOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0bWUubGFiZWxEaWZmcyA9IFtdO1xyXG5cdFx0XHR2YXIgc2NhbGVMYWJlbERpZmZzID0gW107XHJcblx0XHRcdC8vIFBhcnNlIGNvbW1vbiBsYWJlbHMgb25jZVxyXG5cdFx0XHRpZiAobWUuY2hhcnQuZGF0YS5sYWJlbHMgJiYgbWUuY2hhcnQuZGF0YS5sYWJlbHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdGhlbHBlcnMuZWFjaChtZS5jaGFydC5kYXRhLmxhYmVscywgZnVuY3Rpb24obGFiZWwpIHtcclxuXHRcdFx0XHRcdHZhciBsYWJlbE1vbWVudCA9IG1lLnBhcnNlVGltZShsYWJlbCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGxhYmVsTW9tZW50LmlzVmFsaWQoKSkge1xyXG5cdFx0XHRcdFx0XHRpZiAobWUub3B0aW9ucy50aW1lLnJvdW5kKSB7XHJcblx0XHRcdFx0XHRcdFx0bGFiZWxNb21lbnQuc3RhcnRPZihtZS5vcHRpb25zLnRpbWUucm91bmQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHNjYWxlTGFiZWxEaWZmcy5wdXNoKGxhYmVsTW9tZW50LmRpZmYobWUuZmlyc3RUaWNrLCBtZS50aWNrVW5pdCwgdHJ1ZSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sIG1lKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aGVscGVycy5lYWNoKG1lLmNoYXJ0LmRhdGEuZGF0YXNldHMsIGZ1bmN0aW9uKGRhdGFzZXQpIHtcclxuXHRcdFx0XHR2YXIgZGlmZnNGb3JEYXRhc2V0ID0gW107XHJcblxyXG5cdFx0XHRcdGlmICh0eXBlb2YgZGF0YXNldC5kYXRhWzBdID09PSAnb2JqZWN0JyAmJiBkYXRhc2V0LmRhdGFbMF0gIT09IG51bGwpIHtcclxuXHRcdFx0XHRcdGhlbHBlcnMuZWFjaChkYXRhc2V0LmRhdGEsIGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdHZhciBsYWJlbE1vbWVudCA9IG1lLnBhcnNlVGltZShtZS5nZXRSaWdodFZhbHVlKHZhbHVlKSk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAobGFiZWxNb21lbnQuaXNWYWxpZCgpKSB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKG1lLm9wdGlvbnMudGltZS5yb3VuZCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0bGFiZWxNb21lbnQuc3RhcnRPZihtZS5vcHRpb25zLnRpbWUucm91bmQpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRkaWZmc0ZvckRhdGFzZXQucHVzaChsYWJlbE1vbWVudC5kaWZmKG1lLmZpcnN0VGljaywgbWUudGlja1VuaXQsIHRydWUpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSwgbWUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBXZSBoYXZlIG5vIGxhYmVscy4gVXNlIGNvbW1vbiBvbmVzXHJcblx0XHRcdFx0XHRkaWZmc0ZvckRhdGFzZXQgPSBzY2FsZUxhYmVsRGlmZnM7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRtZS5sYWJlbERpZmZzLnB1c2goZGlmZnNGb3JEYXRhc2V0KTtcclxuXHRcdFx0fSwgbWUpO1xyXG5cdFx0fSxcclxuXHRcdGJ1aWxkVGlja3M6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cclxuXHRcdFx0bWUuY3R4LnNhdmUoKTtcclxuXHRcdFx0dmFyIHRpY2tGb250U2l6ZSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQobWUub3B0aW9ucy50aWNrcy5mb250U2l6ZSwgQ2hhcnQuZGVmYXVsdHMuZ2xvYmFsLmRlZmF1bHRGb250U2l6ZSk7XHJcblx0XHRcdHZhciB0aWNrRm9udFN0eWxlID0gaGVscGVycy5nZXRWYWx1ZU9yRGVmYXVsdChtZS5vcHRpb25zLnRpY2tzLmZvbnRTdHlsZSwgQ2hhcnQuZGVmYXVsdHMuZ2xvYmFsLmRlZmF1bHRGb250U3R5bGUpO1xyXG5cdFx0XHR2YXIgdGlja0ZvbnRGYW1pbHkgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KG1lLm9wdGlvbnMudGlja3MuZm9udEZhbWlseSwgQ2hhcnQuZGVmYXVsdHMuZ2xvYmFsLmRlZmF1bHRGb250RmFtaWx5KTtcclxuXHRcdFx0dmFyIHRpY2tMYWJlbEZvbnQgPSBoZWxwZXJzLmZvbnRTdHJpbmcodGlja0ZvbnRTaXplLCB0aWNrRm9udFN0eWxlLCB0aWNrRm9udEZhbWlseSk7XHJcblx0XHRcdG1lLmN0eC5mb250ID0gdGlja0xhYmVsRm9udDtcclxuXHRcdFx0bWUuY3R4LnNldEZvbnRTaXplKHRpY2tGb250U2l6ZSk7XHJcblxyXG5cdFx0XHRtZS50aWNrcyA9IFtdO1xyXG5cdFx0XHRtZS51bml0U2NhbGUgPSAxOyAvLyBIb3cgbXVjaCB3ZSBzY2FsZSB0aGUgdW5pdCBieSwgaWUgMiBtZWFucyAyeCB1bml0IHBlciBzdGVwXHJcblx0XHRcdG1lLnNjYWxlU2l6ZUluVW5pdHMgPSAwOyAvLyBIb3cgbGFyZ2UgdGhlIHNjYWxlIGlzIGluIHRoZSBiYXNlIHVuaXQgKHNlY29uZHMsIG1pbnV0ZXMsIGV0YylcclxuXHJcblx0XHRcdC8vIFNldCB1bml0IG92ZXJyaWRlIGlmIGFwcGxpY2FibGVcclxuXHRcdFx0aWYgKG1lLm9wdGlvbnMudGltZS51bml0KSB7XHJcblx0XHRcdFx0bWUudGlja1VuaXQgPSBtZS5vcHRpb25zLnRpbWUudW5pdCB8fCAnZGF5JztcclxuXHRcdFx0XHRtZS5kaXNwbGF5Rm9ybWF0ID0gbWUub3B0aW9ucy50aW1lLmRpc3BsYXlGb3JtYXRzW21lLnRpY2tVbml0XTtcclxuXHRcdFx0XHRtZS5zY2FsZVNpemVJblVuaXRzID0gbWUubGFzdFRpY2suZGlmZihtZS5maXJzdFRpY2ssIG1lLnRpY2tVbml0LCB0cnVlKTtcclxuXHRcdFx0XHRtZS51bml0U2NhbGUgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KG1lLm9wdGlvbnMudGltZS51bml0U3RlcFNpemUsIDEpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIERldGVybWluZSB0aGUgc21hbGxlc3QgbmVlZGVkIHVuaXQgb2YgdGhlIHRpbWVcclxuXHRcdFx0XHR2YXIgaW5uZXJXaWR0aCA9IG1lLmlzSG9yaXpvbnRhbCgpID8gbWUud2lkdGggLSAobWUucGFkZGluZ0xlZnQgKyBtZS5wYWRkaW5nUmlnaHQpIDogbWUuaGVpZ2h0IC0gKG1lLnBhZGRpbmdUb3AgKyBtZS5wYWRkaW5nQm90dG9tKTtcclxuXHJcblx0XHRcdFx0Ly8gQ3J1ZGUgYXBwcm94aW1hdGlvbiBvZiB3aGF0IHRoZSBsYWJlbCBsZW5ndGggbWlnaHQgYmVcclxuXHRcdFx0XHR2YXIgdGVtcEZpcnN0TGFiZWwgPSBtZS50aWNrRm9ybWF0RnVuY3Rpb24obWUuZmlyc3RUaWNrLCAwLCBbXSk7XHJcblx0XHRcdFx0dmFyIHRpY2tMYWJlbFdpZHRoID0gbWUuY3R4Lm1lYXN1cmVUZXh0KHRlbXBGaXJzdExhYmVsKS53aWR0aDtcclxuXHRcdFx0XHR2YXIgY29zUm90YXRpb24gPSBNYXRoLmNvcyhoZWxwZXJzLnRvUmFkaWFucyhtZS5vcHRpb25zLnRpY2tzLm1heFJvdGF0aW9uKSk7XHJcblx0XHRcdFx0dmFyIHNpblJvdGF0aW9uID0gTWF0aC5zaW4oaGVscGVycy50b1JhZGlhbnMobWUub3B0aW9ucy50aWNrcy5tYXhSb3RhdGlvbikpO1xyXG5cdFx0XHRcdHRpY2tMYWJlbFdpZHRoID0gKHRpY2tMYWJlbFdpZHRoICogY29zUm90YXRpb24pICsgKHRpY2tGb250U2l6ZSAqIHNpblJvdGF0aW9uKTtcclxuXHRcdFx0XHR2YXIgbGFiZWxDYXBhY2l0eSA9IGlubmVyV2lkdGggLyAodGlja0xhYmVsV2lkdGgpO1xyXG5cclxuXHRcdFx0XHQvLyBTdGFydCBhcyBzbWFsbCBhcyBwb3NzaWJsZVxyXG5cdFx0XHRcdG1lLnRpY2tVbml0ID0gbWUub3B0aW9ucy50aW1lLm1pblVuaXQ7XHJcblx0XHRcdFx0bWUuc2NhbGVTaXplSW5Vbml0cyA9IG1lLmxhc3RUaWNrLmRpZmYobWUuZmlyc3RUaWNrLCBtZS50aWNrVW5pdCwgdHJ1ZSk7XHJcblx0XHRcdFx0bWUuZGlzcGxheUZvcm1hdCA9IG1lLm9wdGlvbnMudGltZS5kaXNwbGF5Rm9ybWF0c1ttZS50aWNrVW5pdF07XHJcblxyXG5cdFx0XHRcdHZhciB1bml0RGVmaW5pdGlvbkluZGV4ID0gMDtcclxuXHRcdFx0XHR2YXIgdW5pdERlZmluaXRpb24gPSB0aW1lLnVuaXRzW3VuaXREZWZpbml0aW9uSW5kZXhdO1xyXG5cclxuXHRcdFx0XHQvLyBXaGlsZSB3ZSBhcmVuJ3QgaWRlYWwgYW5kIHdlIGRvbid0IGhhdmUgdW5pdHMgbGVmdFxyXG5cdFx0XHRcdHdoaWxlICh1bml0RGVmaW5pdGlvbkluZGV4IDwgdGltZS51bml0cy5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdC8vIENhbiB3ZSBzY2FsZSB0aGlzIHVuaXQuIElmIGBmYWxzZWAgd2UgY2FuIHNjYWxlIGluZmluaXRlbHlcclxuXHRcdFx0XHRcdG1lLnVuaXRTY2FsZSA9IDE7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGhlbHBlcnMuaXNBcnJheSh1bml0RGVmaW5pdGlvbi5zdGVwcykgJiYgTWF0aC5jZWlsKG1lLnNjYWxlU2l6ZUluVW5pdHMgLyBsYWJlbENhcGFjaXR5KSA8IGhlbHBlcnMubWF4KHVuaXREZWZpbml0aW9uLnN0ZXBzKSkge1xyXG5cdFx0XHRcdFx0XHQvLyBVc2Ugb25lIG9mIHRoZSBwcmVkZWZpbmVkIHN0ZXBzXHJcblx0XHRcdFx0XHRcdGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IHVuaXREZWZpbml0aW9uLnN0ZXBzLmxlbmd0aDsgKytpZHgpIHtcclxuXHRcdFx0XHRcdFx0XHRpZiAodW5pdERlZmluaXRpb24uc3RlcHNbaWR4XSA+PSBNYXRoLmNlaWwobWUuc2NhbGVTaXplSW5Vbml0cyAvIGxhYmVsQ2FwYWNpdHkpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRtZS51bml0U2NhbGUgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KG1lLm9wdGlvbnMudGltZS51bml0U3RlcFNpemUsIHVuaXREZWZpbml0aW9uLnN0ZXBzW2lkeF0pO1xyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoKHVuaXREZWZpbml0aW9uLm1heFN0ZXAgPT09IGZhbHNlKSB8fCAoTWF0aC5jZWlsKG1lLnNjYWxlU2l6ZUluVW5pdHMgLyBsYWJlbENhcGFjaXR5KSA8IHVuaXREZWZpbml0aW9uLm1heFN0ZXApKSB7XHJcblx0XHRcdFx0XHRcdC8vIFdlIGhhdmUgYSBtYXggc3RlcC4gU2NhbGUgdGhpcyB1bml0XHJcblx0XHRcdFx0XHRcdG1lLnVuaXRTY2FsZSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQobWUub3B0aW9ucy50aW1lLnVuaXRTdGVwU2l6ZSwgTWF0aC5jZWlsKG1lLnNjYWxlU2l6ZUluVW5pdHMgLyBsYWJlbENhcGFjaXR5KSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gTW92ZSB0byB0aGUgbmV4dCB1bml0IHVwXHJcblx0XHRcdFx0XHRcdCsrdW5pdERlZmluaXRpb25JbmRleDtcclxuXHRcdFx0XHRcdFx0dW5pdERlZmluaXRpb24gPSB0aW1lLnVuaXRzW3VuaXREZWZpbml0aW9uSW5kZXhdO1xyXG5cclxuXHRcdFx0XHRcdFx0bWUudGlja1VuaXQgPSB1bml0RGVmaW5pdGlvbi5uYW1lO1xyXG5cdFx0XHRcdFx0XHR2YXIgbGVhZGluZ1VuaXRCdWZmZXIgPSBtZS5maXJzdFRpY2suZGlmZihtZS5nZXRNb21lbnRTdGFydE9mKG1lLmZpcnN0VGljayksIG1lLnRpY2tVbml0LCB0cnVlKTtcclxuXHRcdFx0XHRcdFx0dmFyIHRyYWlsaW5nVW5pdEJ1ZmZlciA9IG1lLmdldE1vbWVudFN0YXJ0T2YobWUubGFzdFRpY2suY2xvbmUoKS5hZGQoMSwgbWUudGlja1VuaXQpKS5kaWZmKG1lLmxhc3RUaWNrLCBtZS50aWNrVW5pdCwgdHJ1ZSk7XHJcblx0XHRcdFx0XHRcdG1lLnNjYWxlU2l6ZUluVW5pdHMgPSBtZS5sYXN0VGljay5kaWZmKG1lLmZpcnN0VGljaywgbWUudGlja1VuaXQsIHRydWUpICsgbGVhZGluZ1VuaXRCdWZmZXIgKyB0cmFpbGluZ1VuaXRCdWZmZXI7XHJcblx0XHRcdFx0XHRcdG1lLmRpc3BsYXlGb3JtYXQgPSBtZS5vcHRpb25zLnRpbWUuZGlzcGxheUZvcm1hdHNbdW5pdERlZmluaXRpb24ubmFtZV07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgcm91bmRlZFN0YXJ0O1xyXG5cclxuXHRcdFx0Ly8gT25seSByb3VuZCB0aGUgZmlyc3QgdGljayBpZiB3ZSBoYXZlIG5vIGhhcmQgbWluaW11bVxyXG5cdFx0XHRpZiAoIW1lLm9wdGlvbnMudGltZS5taW4pIHtcclxuXHRcdFx0XHRtZS5maXJzdFRpY2sgPSBtZS5nZXRNb21lbnRTdGFydE9mKG1lLmZpcnN0VGljayk7XHJcblx0XHRcdFx0cm91bmRlZFN0YXJ0ID0gbWUuZmlyc3RUaWNrO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHJvdW5kZWRTdGFydCA9IG1lLmdldE1vbWVudFN0YXJ0T2YobWUuZmlyc3RUaWNrKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gT25seSByb3VuZCB0aGUgbGFzdCB0aWNrIGlmIHdlIGhhdmUgbm8gaGFyZCBtYXhpbXVtXHJcblx0XHRcdGlmICghbWUub3B0aW9ucy50aW1lLm1heCkge1xyXG5cdFx0XHRcdHZhciByb3VuZGVkRW5kID0gbWUuZ2V0TW9tZW50U3RhcnRPZihtZS5sYXN0VGljayk7XHJcblx0XHRcdFx0dmFyIGRlbHRhID0gcm91bmRlZEVuZC5kaWZmKG1lLmxhc3RUaWNrLCBtZS50aWNrVW5pdCwgdHJ1ZSk7XHJcblx0XHRcdFx0aWYgKGRlbHRhIDwgMCkge1xyXG5cdFx0XHRcdFx0Ly8gRG8gbm90IHVzZSBlbmQgb2YgYmVjYXVzZSB3ZSBuZWVkIG1lIHRvIGJlIGluIHRoZSBuZXh0IHRpbWUgdW5pdFxyXG5cdFx0XHRcdFx0bWUubGFzdFRpY2sgPSBtZS5nZXRNb21lbnRTdGFydE9mKG1lLmxhc3RUaWNrLmFkZCgxLCBtZS50aWNrVW5pdCkpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZGVsdGEgPj0gMCkge1xyXG5cdFx0XHRcdFx0bWUubGFzdFRpY2sgPSByb3VuZGVkRW5kO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0bWUuc2NhbGVTaXplSW5Vbml0cyA9IG1lLmxhc3RUaWNrLmRpZmYobWUuZmlyc3RUaWNrLCBtZS50aWNrVW5pdCwgdHJ1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRpY2sgZGlzcGxheUZvcm1hdCBvdmVycmlkZVxyXG5cdFx0XHRpZiAobWUub3B0aW9ucy50aW1lLmRpc3BsYXlGb3JtYXQpIHtcclxuXHRcdFx0XHRtZS5kaXNwbGF5Rm9ybWF0ID0gbWUub3B0aW9ucy50aW1lLmRpc3BsYXlGb3JtYXQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGZpcnN0IHRpY2suIHdpbGwgaGF2ZSBiZWVuIHJvdW5kZWQgY29ycmVjdGx5IGlmIG9wdGlvbnMudGltZS5taW4gaXMgbm90IHNwZWNpZmllZFxyXG5cdFx0XHRtZS50aWNrcy5wdXNoKG1lLmZpcnN0VGljay5jbG9uZSgpKTtcclxuXHJcblx0XHRcdC8vIEZvciBldmVyeSB1bml0IGluIGJldHdlZW4gdGhlIGZpcnN0IGFuZCBsYXN0IG1vbWVudCwgY3JlYXRlIGEgbW9tZW50IGFuZCBhZGQgaXQgdG8gdGhlIHRpY2tzIHRpY2tcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDE7IGkgPD0gbWUuc2NhbGVTaXplSW5Vbml0czsgKytpKSB7XHJcblx0XHRcdFx0dmFyIG5ld1RpY2sgPSByb3VuZGVkU3RhcnQuY2xvbmUoKS5hZGQoaSwgbWUudGlja1VuaXQpO1xyXG5cclxuXHRcdFx0XHQvLyBBcmUgd2UgZ3JlYXRlciB0aGFuIHRoZSBtYXggdGltZVxyXG5cdFx0XHRcdGlmIChtZS5vcHRpb25zLnRpbWUubWF4ICYmIG5ld1RpY2suZGlmZihtZS5sYXN0VGljaywgbWUudGlja1VuaXQsIHRydWUpID49IDApIHtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKGkgJSBtZS51bml0U2NhbGUgPT09IDApIHtcclxuXHRcdFx0XHRcdG1lLnRpY2tzLnB1c2gobmV3VGljayk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBbHdheXMgc2hvdyB0aGUgcmlnaHQgdGlja1xyXG5cdFx0XHR2YXIgZGlmZiA9IG1lLnRpY2tzW21lLnRpY2tzLmxlbmd0aCAtIDFdLmRpZmYobWUubGFzdFRpY2ssIG1lLnRpY2tVbml0KTtcclxuXHRcdFx0aWYgKGRpZmYgIT09IDAgfHwgbWUuc2NhbGVTaXplSW5Vbml0cyA9PT0gMCkge1xyXG5cdFx0XHRcdC8vIHRoaXMgaXMgYSB3ZWlyZCBjYXNlLiBJZiB0aGUgPG1heD4gb3B0aW9uIGlzIHRoZSBzYW1lIGFzIHRoZSBlbmQgb3B0aW9uLCB3ZSBjYW4ndCBqdXN0IGRpZmYgdGhlIHRpbWVzIGJlY2F1c2UgdGhlIHRpY2sgd2FzIGNyZWF0ZWQgZnJvbSB0aGUgcm91bmRlZFN0YXJ0XHJcblx0XHRcdFx0Ly8gYnV0IHRoZSBsYXN0IHRpY2sgd2FzIG5vdCByb3VuZGVkLlxyXG5cdFx0XHRcdGlmIChtZS5vcHRpb25zLnRpbWUubWF4KSB7XHJcblx0XHRcdFx0XHRtZS50aWNrcy5wdXNoKG1lLmxhc3RUaWNrLmNsb25lKCkpO1xyXG5cdFx0XHRcdFx0bWUuc2NhbGVTaXplSW5Vbml0cyA9IG1lLmxhc3RUaWNrLmRpZmYobWUudGlja3NbMF0sIG1lLnRpY2tVbml0LCB0cnVlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bWUudGlja3MucHVzaChtZS5sYXN0VGljay5jbG9uZSgpKTtcclxuXHRcdFx0XHRcdG1lLnNjYWxlU2l6ZUluVW5pdHMgPSBtZS5sYXN0VGljay5kaWZmKG1lLmZpcnN0VGljaywgbWUudGlja1VuaXQsIHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bWUuY3R4LnJlc3RvcmUoKTtcclxuXHJcblx0XHRcdC8vIEludmFsaWRhdGUgbGFiZWwgZGlmZnMgY2FjaGVcclxuXHRcdFx0bWUubGFiZWxEaWZmcyA9IHVuZGVmaW5lZDtcclxuXHRcdH0sXHJcblx0XHQvLyBHZXQgdG9vbHRpcCBsYWJlbFxyXG5cdFx0Z2V0TGFiZWxGb3JJbmRleDogZnVuY3Rpb24oaW5kZXgsIGRhdGFzZXRJbmRleCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgbGFiZWwgPSBtZS5jaGFydC5kYXRhLmxhYmVscyAmJiBpbmRleCA8IG1lLmNoYXJ0LmRhdGEubGFiZWxzLmxlbmd0aCA/IG1lLmNoYXJ0LmRhdGEubGFiZWxzW2luZGV4XSA6ICcnO1xyXG5cclxuXHRcdFx0aWYgKHR5cGVvZiBtZS5jaGFydC5kYXRhLmRhdGFzZXRzW2RhdGFzZXRJbmRleF0uZGF0YVswXSA9PT0gJ29iamVjdCcpIHtcclxuXHRcdFx0XHRsYWJlbCA9IG1lLmdldFJpZ2h0VmFsdWUobWUuY2hhcnQuZGF0YS5kYXRhc2V0c1tkYXRhc2V0SW5kZXhdLmRhdGFbaW5kZXhdKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRm9ybWF0IG5pY2VseVxyXG5cdFx0XHRpZiAobWUub3B0aW9ucy50aW1lLnRvb2x0aXBGb3JtYXQpIHtcclxuXHRcdFx0XHRsYWJlbCA9IG1lLnBhcnNlVGltZShsYWJlbCkuZm9ybWF0KG1lLm9wdGlvbnMudGltZS50b29sdGlwRm9ybWF0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGxhYmVsO1xyXG5cdFx0fSxcclxuXHRcdC8vIEZ1bmN0aW9uIHRvIGZvcm1hdCBhbiBpbmRpdmlkdWFsIHRpY2sgbWFya1xyXG5cdFx0dGlja0Zvcm1hdEZ1bmN0aW9uOiBmdW5jdGlvbih0aWNrLCBpbmRleCwgdGlja3MpIHtcclxuXHRcdFx0dmFyIGZvcm1hdHRlZFRpY2sgPSB0aWNrLmZvcm1hdCh0aGlzLmRpc3BsYXlGb3JtYXQpO1xyXG5cdFx0XHR2YXIgdGlja09wdHMgPSB0aGlzLm9wdGlvbnMudGlja3M7XHJcblx0XHRcdHZhciBjYWxsYmFjayA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQodGlja09wdHMuY2FsbGJhY2ssIHRpY2tPcHRzLnVzZXJDYWxsYmFjayk7XHJcblxyXG5cdFx0XHRpZiAoY2FsbGJhY2spIHtcclxuXHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soZm9ybWF0dGVkVGljaywgaW5kZXgsIHRpY2tzKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZm9ybWF0dGVkVGljaztcclxuXHRcdH0sXHJcblx0XHRjb252ZXJ0VGlja3NUb0xhYmVsczogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdG1lLnRpY2tNb21lbnRzID0gbWUudGlja3M7XHJcblx0XHRcdG1lLnRpY2tzID0gbWUudGlja3MubWFwKG1lLnRpY2tGb3JtYXRGdW5jdGlvbiwgbWUpO1xyXG5cdFx0fSxcclxuXHRcdGdldFBpeGVsRm9yVmFsdWU6IGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgZGF0YXNldEluZGV4KSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBvZmZzZXQgPSBudWxsO1xyXG5cdFx0XHRpZiAoaW5kZXggIT09IHVuZGVmaW5lZCAmJiBkYXRhc2V0SW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdG9mZnNldCA9IG1lLmdldExhYmVsRGlmZihkYXRhc2V0SW5kZXgsIGluZGV4KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKG9mZnNldCA9PT0gbnVsbCkge1xyXG5cdFx0XHRcdGlmICghdmFsdWUgfHwgIXZhbHVlLmlzVmFsaWQpIHtcclxuXHRcdFx0XHRcdC8vIG5vdCBhbHJlYWR5IGEgbW9tZW50IG9iamVjdFxyXG5cdFx0XHRcdFx0dmFsdWUgPSBtZS5wYXJzZVRpbWUobWUuZ2V0UmlnaHRWYWx1ZSh2YWx1ZSkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAodmFsdWUgJiYgdmFsdWUuaXNWYWxpZCAmJiB2YWx1ZS5pc1ZhbGlkKCkpIHtcclxuXHRcdFx0XHRcdG9mZnNldCA9IHZhbHVlLmRpZmYobWUuZmlyc3RUaWNrLCBtZS50aWNrVW5pdCwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAob2Zmc2V0ICE9PSBudWxsKSB7XHJcblx0XHRcdFx0dmFyIGRlY2ltYWwgPSBvZmZzZXQgIT09IDAgPyBvZmZzZXQgLyBtZS5zY2FsZVNpemVJblVuaXRzIDogb2Zmc2V0O1xyXG5cclxuXHRcdFx0XHRpZiAobWUuaXNIb3Jpem9udGFsKCkpIHtcclxuXHRcdFx0XHRcdHZhciBpbm5lcldpZHRoID0gbWUud2lkdGggLSAobWUucGFkZGluZ0xlZnQgKyBtZS5wYWRkaW5nUmlnaHQpO1xyXG5cdFx0XHRcdFx0dmFyIHZhbHVlT2Zmc2V0ID0gKGlubmVyV2lkdGggKiBkZWNpbWFsKSArIG1lLnBhZGRpbmdMZWZ0O1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiBtZS5sZWZ0ICsgTWF0aC5yb3VuZCh2YWx1ZU9mZnNldCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHZhciBpbm5lckhlaWdodCA9IG1lLmhlaWdodCAtIChtZS5wYWRkaW5nVG9wICsgbWUucGFkZGluZ0JvdHRvbSk7XHJcblx0XHRcdFx0dmFyIGhlaWdodE9mZnNldCA9IChpbm5lckhlaWdodCAqIGRlY2ltYWwpICsgbWUucGFkZGluZ1RvcDtcclxuXHJcblx0XHRcdFx0cmV0dXJuIG1lLnRvcCArIE1hdGgucm91bmQoaGVpZ2h0T2Zmc2V0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdGdldFBpeGVsRm9yVGljazogZnVuY3Rpb24oaW5kZXgpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0UGl4ZWxGb3JWYWx1ZSh0aGlzLnRpY2tNb21lbnRzW2luZGV4XSwgbnVsbCwgbnVsbCk7XHJcblx0XHR9LFxyXG5cdFx0Z2V0VmFsdWVGb3JQaXhlbDogZnVuY3Rpb24ocGl4ZWwpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0dmFyIGlubmVyRGltZW5zaW9uID0gbWUuaXNIb3Jpem9udGFsKCkgPyBtZS53aWR0aCAtIChtZS5wYWRkaW5nTGVmdCArIG1lLnBhZGRpbmdSaWdodCkgOiBtZS5oZWlnaHQgLSAobWUucGFkZGluZ1RvcCArIG1lLnBhZGRpbmdCb3R0b20pO1xyXG5cdFx0XHR2YXIgb2Zmc2V0ID0gKHBpeGVsIC0gKG1lLmlzSG9yaXpvbnRhbCgpID8gbWUubGVmdCArIG1lLnBhZGRpbmdMZWZ0IDogbWUudG9wICsgbWUucGFkZGluZ1RvcCkpIC8gaW5uZXJEaW1lbnNpb247XHJcblx0XHRcdG9mZnNldCAqPSBtZS5zY2FsZVNpemVJblVuaXRzO1xyXG5cdFx0XHRyZXR1cm4gbWUuZmlyc3RUaWNrLmNsb25lKCkuYWRkKG1vbWVudC5kdXJhdGlvbihvZmZzZXQsIG1lLnRpY2tVbml0KS5hc1NlY29uZHMoKSwgJ3NlY29uZHMnKTtcclxuXHRcdH0sXHJcblx0XHRwYXJzZVRpbWU6IGZ1bmN0aW9uKGxhYmVsKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdGlmICh0eXBlb2YgbWUub3B0aW9ucy50aW1lLnBhcnNlciA9PT0gJ3N0cmluZycpIHtcclxuXHRcdFx0XHRyZXR1cm4gbW9tZW50KGxhYmVsLCBtZS5vcHRpb25zLnRpbWUucGFyc2VyKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodHlwZW9mIG1lLm9wdGlvbnMudGltZS5wYXJzZXIgPT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0XHRyZXR1cm4gbWUub3B0aW9ucy50aW1lLnBhcnNlcihsYWJlbCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gRGF0ZSBvYmplY3RzXHJcblx0XHRcdGlmICh0eXBlb2YgbGFiZWwuZ2V0TW9udGggPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIGxhYmVsID09PSAnbnVtYmVyJykge1xyXG5cdFx0XHRcdHJldHVybiBtb21lbnQobGFiZWwpO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIE1vbWVudCBzdXBwb3J0XHJcblx0XHRcdGlmIChsYWJlbC5pc1ZhbGlkICYmIGxhYmVsLmlzVmFsaWQoKSkge1xyXG5cdFx0XHRcdHJldHVybiBsYWJlbDtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBDdXN0b20gcGFyc2luZyAocmV0dXJuIGFuIGluc3RhbmNlIG9mIG1vbWVudClcclxuXHRcdFx0aWYgKHR5cGVvZiBtZS5vcHRpb25zLnRpbWUuZm9ybWF0ICE9PSAnc3RyaW5nJyAmJiBtZS5vcHRpb25zLnRpbWUuZm9ybWF0LmNhbGwpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oJ29wdGlvbnMudGltZS5mb3JtYXQgaXMgZGVwcmVjYXRlZCBhbmQgcmVwbGFjZWQgYnkgb3B0aW9ucy50aW1lLnBhcnNlci4gU2VlIGh0dHA6Ly9ubm5pY2suZ2l0aHViLmlvL0NoYXJ0LmpzL2RvY3MtdjIvI3NjYWxlcy10aW1lLXNjYWxlJyk7XHJcblx0XHRcdFx0cmV0dXJuIG1lLm9wdGlvbnMudGltZS5mb3JtYXQobGFiZWwpO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIE1vbWVudCBmb3JtYXQgcGFyc2luZ1xyXG5cdFx0XHRyZXR1cm4gbW9tZW50KGxhYmVsLCBtZS5vcHRpb25zLnRpbWUuZm9ybWF0KTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHRDaGFydC5zY2FsZVNlcnZpY2UucmVnaXN0ZXJTY2FsZVR5cGUoJ3RpbWUnLCBUaW1lU2NhbGUsIGRlZmF1bHRDb25maWcpO1xyXG5cclxufTtcclxuIl19