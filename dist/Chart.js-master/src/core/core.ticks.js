'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;

	/**
  * Namespace to hold static tick generation functions
  * @namespace Chart.Ticks
  */
	Chart.Ticks = {
		/**
   * Namespace to hold generators for different types of ticks
   * @namespace Chart.Ticks.generators
   */
		generators: {
			/**
    * Interface for the options provided to the numeric tick generator
    * @interface INumericTickGenerationOptions
    */
			/**
    * The maximum number of ticks to display
    * @name INumericTickGenerationOptions#maxTicks
    * @type Number
    */
			/**
    * The distance between each tick.
    * @name INumericTickGenerationOptions#stepSize
    * @type Number
    * @optional
    */
			/**
    * Forced minimum for the ticks. If not specified, the minimum of the data range is used to calculate the tick minimum
    * @name INumericTickGenerationOptions#min
    * @type Number
    * @optional
    */
			/**
    * The maximum value of the ticks. If not specified, the maximum of the data range is used to calculate the tick maximum
    * @name INumericTickGenerationOptions#max
    * @type Number
    * @optional
    */

			/**
    * Generate a set of linear ticks
    * @method Chart.Ticks.generators.linear
    * @param generationOptions {INumericTickGenerationOptions} the options used to generate the ticks
    * @param dataRange {IRange} the range of the data
    * @returns {Array<Number>} array of tick values
    */
			linear: function linear(generationOptions, dataRange) {
				var ticks = [];
				// To get a "nice" value for the tick spacing, we will use the appropriately named
				// "nice number" algorithm. See http://stackoverflow.com/questions/8506881/nice-label-algorithm-for-charts-with-minimum-ticks
				// for details.

				var spacing;
				if (generationOptions.stepSize && generationOptions.stepSize > 0) {
					spacing = generationOptions.stepSize;
				} else {
					var niceRange = helpers.niceNum(dataRange.max - dataRange.min, false);
					spacing = helpers.niceNum(niceRange / (generationOptions.maxTicks - 1), true);
				}
				var niceMin = Math.floor(dataRange.min / spacing) * spacing;
				var niceMax = Math.ceil(dataRange.max / spacing) * spacing;

				// If min, max and stepSize is set and they make an evenly spaced scale use it.
				if (generationOptions.min && generationOptions.max && generationOptions.stepSize) {
					var minMaxDeltaDivisibleByStepSize = (generationOptions.max - generationOptions.min) % generationOptions.stepSize === 0;
					if (minMaxDeltaDivisibleByStepSize) {
						niceMin = generationOptions.min;
						niceMax = generationOptions.max;
					}
				}

				var numSpaces = (niceMax - niceMin) / spacing;
				// If very close to our rounded value, use it.
				if (helpers.almostEquals(numSpaces, Math.round(numSpaces), spacing / 1000)) {
					numSpaces = Math.round(numSpaces);
				} else {
					numSpaces = Math.ceil(numSpaces);
				}

				// Put the values into the ticks array
				ticks.push(generationOptions.min !== undefined ? generationOptions.min : niceMin);
				for (var j = 1; j < numSpaces; ++j) {
					ticks.push(niceMin + j * spacing);
				}
				ticks.push(generationOptions.max !== undefined ? generationOptions.max : niceMax);

				return ticks;
			},

			/**
    * Generate a set of logarithmic ticks
    * @method Chart.Ticks.generators.logarithmic
    * @param generationOptions {INumericTickGenerationOptions} the options used to generate the ticks
    * @param dataRange {IRange} the range of the data
    * @returns {Array<Number>} array of tick values
    */
			logarithmic: function logarithmic(generationOptions, dataRange) {
				var ticks = [];
				var getValueOrDefault = helpers.getValueOrDefault;

				// Figure out what the max number of ticks we can support it is based on the size of
				// the axis area. For now, we say that the minimum tick spacing in pixels must be 50
				// We also limit the maximum number of ticks to 11 which gives a nice 10 squares on
				// the graph
				var tickVal = getValueOrDefault(generationOptions.min, Math.pow(10, Math.floor(helpers.log10(dataRange.min))));

				while (tickVal < dataRange.max) {
					ticks.push(tickVal);

					var exp;
					var significand;

					if (tickVal === 0) {
						exp = Math.floor(helpers.log10(dataRange.minNotZero));
						significand = Math.round(dataRange.minNotZero / Math.pow(10, exp));
					} else {
						exp = Math.floor(helpers.log10(tickVal));
						significand = Math.floor(tickVal / Math.pow(10, exp)) + 1;
					}

					if (significand === 10) {
						significand = 1;
						++exp;
					}

					tickVal = significand * Math.pow(10, exp);
				}

				var lastTick = getValueOrDefault(generationOptions.max, tickVal);
				ticks.push(lastTick);

				return ticks;
			}
		},

		/**
   * Namespace to hold formatters for different types of ticks
   * @namespace Chart.Ticks.formatters
   */
		formatters: {
			/**
    * Formatter for value labels
    * @method Chart.Ticks.formatters.values
    * @param value the value to display
    * @return {String|Array} the label to display
    */
			values: function values(value) {
				return helpers.isArray(value) ? value : '' + value;
			},

			/**
    * Formatter for linear numeric ticks
    * @method Chart.Ticks.formatters.linear
    * @param tickValue {Number} the value to be formatted
    * @param index {Number} the position of the tickValue parameter in the ticks array
    * @param ticks {Array<Number>} the list of ticks being converted
    * @return {String} string representation of the tickValue parameter
    */
			linear: function linear(tickValue, index, ticks) {
				// If we have lots of ticks, don't use the ones
				var delta = ticks.length > 3 ? ticks[2] - ticks[1] : ticks[1] - ticks[0];

				// If we have a number like 2.5 as the delta, figure out how many decimal places we need
				if (Math.abs(delta) > 1) {
					if (tickValue !== Math.floor(tickValue)) {
						// not an integer
						delta = tickValue - Math.floor(tickValue);
					}
				}

				var logDelta = helpers.log10(Math.abs(delta));
				var tickString = '';

				if (tickValue !== 0) {
					var numDecimal = -1 * Math.floor(logDelta);
					numDecimal = Math.max(Math.min(numDecimal, 20), 0); // toFixed has a max of 20 decimal places
					tickString = tickValue.toFixed(numDecimal);
				} else {
					tickString = '0'; // never show decimal places for 0
				}

				return tickString;
			},

			logarithmic: function logarithmic(tickValue, index, ticks) {
				var remain = tickValue / Math.pow(10, Math.floor(helpers.log10(tickValue)));

				if (tickValue === 0) {
					return '0';
				} else if (remain === 1 || remain === 2 || remain === 5 || index === 0 || index === ticks.length - 1) {
					return tickValue.toExponential();
				}
				return '';
			}
		}
	};
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUudGlja3MuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0cyIsIkNoYXJ0IiwiaGVscGVycyIsIlRpY2tzIiwiZ2VuZXJhdG9ycyIsImxpbmVhciIsImdlbmVyYXRpb25PcHRpb25zIiwiZGF0YVJhbmdlIiwidGlja3MiLCJzcGFjaW5nIiwic3RlcFNpemUiLCJuaWNlUmFuZ2UiLCJuaWNlTnVtIiwibWF4IiwibWluIiwibWF4VGlja3MiLCJuaWNlTWluIiwiTWF0aCIsImZsb29yIiwibmljZU1heCIsImNlaWwiLCJtaW5NYXhEZWx0YURpdmlzaWJsZUJ5U3RlcFNpemUiLCJudW1TcGFjZXMiLCJhbG1vc3RFcXVhbHMiLCJyb3VuZCIsInB1c2giLCJ1bmRlZmluZWQiLCJqIiwibG9nYXJpdGhtaWMiLCJnZXRWYWx1ZU9yRGVmYXVsdCIsInRpY2tWYWwiLCJwb3ciLCJsb2cxMCIsImV4cCIsInNpZ25pZmljYW5kIiwibWluTm90WmVybyIsImxhc3RUaWNrIiwiZm9ybWF0dGVycyIsInZhbHVlcyIsInZhbHVlIiwiaXNBcnJheSIsInRpY2tWYWx1ZSIsImluZGV4IiwiZGVsdGEiLCJsZW5ndGgiLCJhYnMiLCJsb2dEZWx0YSIsInRpY2tTdHJpbmciLCJudW1EZWNpbWFsIiwidG9GaXhlZCIsInJlbWFpbiIsInRvRXhwb25lbnRpYWwiXSwibWFwcGluZ3MiOiJBQUFBOztBQUVBQSxPQUFPQyxPQUFQLEdBQWlCLFVBQVNDLEtBQVQsRUFBZ0I7O0FBRWhDLEtBQUlDLFVBQVVELE1BQU1DLE9BQXBCOztBQUVBOzs7O0FBSUFELE9BQU1FLEtBQU4sR0FBYztBQUNiOzs7O0FBSUFDLGNBQVk7QUFDWDs7OztBQUlBOzs7OztBQUtBOzs7Ozs7QUFNQTs7Ozs7O0FBTUE7Ozs7Ozs7QUFPQTs7Ozs7OztBQU9BQyxXQUFRLGdCQUFTQyxpQkFBVCxFQUE0QkMsU0FBNUIsRUFBdUM7QUFDOUMsUUFBSUMsUUFBUSxFQUFaO0FBQ0E7QUFDQTtBQUNBOztBQUVBLFFB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QyxFQUFkO0FBK0xBLENBdk1EIiwiZmlsZSI6ImNvcmUudGlja3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENoYXJ0KSB7XHJcblxyXG5cdHZhciBoZWxwZXJzID0gQ2hhcnQuaGVscGVycztcclxuXHJcblx0LyoqXHJcblx0ICogTmFtZXNwYWNlIHRvIGhvbGQgc3RhdGljIHRpY2sgZ2VuZXJhdGlvbiBmdW5jdGlvbnNcclxuXHQgKiBAbmFtZXNwYWNlIENoYXJ0LlRpY2tzXHJcblx0ICovXHJcblx0Q2hhcnQuVGlja3MgPSB7XHJcblx0XHQvKipcclxuXHRcdCAqIE5hbWVzcGFjZSB0byBob2xkIGdlbmVyYXRvcnMgZm9yIGRpZmZlcmVudCB0eXBlcyBvZiB0aWNrc1xyXG5cdFx0ICogQG5hbWVzcGFjZSBDaGFydC5UaWNrcy5nZW5lcmF0b3JzXHJcblx0XHQgKi9cclxuXHRcdGdlbmVyYXRvcnM6IHtcclxuXHRcdFx0LyoqXHJcblx0XHRcdCAqIEludGVyZmFjZSBmb3IgdGhlIG9wdGlvbnMgcHJvdmlkZWQgdG8gdGhlIG51bWVyaWMgdGljayBnZW5lcmF0b3JcclxuXHRcdFx0ICogQGludGVyZmFjZSBJTnVtZXJpY1RpY2tHZW5lcmF0aW9uT3B0aW9uc1xyXG5cdFx0XHQgKi9cclxuXHRcdFx0LyoqXHJcblx0XHRcdCAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiB0aWNrcyB0byBkaXNwbGF5XHJcblx0XHRcdCAqIEBuYW1lIElOdW1lcmljVGlja0dlbmVyYXRpb25PcHRpb25zI21heFRpY2tzXHJcblx0XHRcdCAqIEB0eXBlIE51bWJlclxyXG5cdFx0XHQgKi9cclxuXHRcdFx0LyoqXHJcblx0XHRcdCAqIFRoZSBkaXN0YW5jZSBiZXR3ZWVuIGVhY2ggdGljay5cclxuXHRcdFx0ICogQG5hbWUgSU51bWVyaWNUaWNrR2VuZXJhdGlvbk9wdGlvbnMjc3RlcFNpemVcclxuXHRcdFx0ICogQHR5cGUgTnVtYmVyXHJcblx0XHRcdCAqIEBvcHRpb25hbFxyXG5cdFx0XHQgKi9cclxuXHRcdFx0LyoqXHJcblx0XHRcdCAqIEZvcmNlZCBtaW5pbXVtIGZvciB0aGUgdGlja3MuIElmIG5vdCBzcGVjaWZpZWQsIHRoZSBtaW5pbXVtIG9mIHRoZSBkYXRhIHJhbmdlIGlzIHVzZWQgdG8gY2FsY3VsYXRlIHRoZSB0aWNrIG1pbmltdW1cclxuXHRcdFx0ICogQG5hbWUgSU51bWVyaWNUaWNrR2VuZXJhdGlvbk9wdGlvbnMjbWluXHJcblx0XHRcdCAqIEB0eXBlIE51bWJlclxyXG5cdFx0XHQgKiBAb3B0aW9uYWxcclxuXHRcdFx0ICovXHJcblx0XHRcdC8qKlxyXG5cdFx0XHQgKiBUaGUgbWF4aW11bSB2YWx1ZSBvZiB0aGUgdGlja3MuIElmIG5vdCBzcGVjaWZpZWQsIHRoZSBtYXhpbXVtIG9mIHRoZSBkYXRhIHJhbmdlIGlzIHVzZWQgdG8gY2FsY3VsYXRlIHRoZSB0aWNrIG1heGltdW1cclxuXHRcdFx0ICogQG5hbWUgSU51bWVyaWNUaWNrR2VuZXJhdGlvbk9wdGlvbnMjbWF4XHJcblx0XHRcdCAqIEB0eXBlIE51bWJlclxyXG5cdFx0XHQgKiBAb3B0aW9uYWxcclxuXHRcdFx0ICovXHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogR2VuZXJhdGUgYSBzZXQgb2YgbGluZWFyIHRpY2tzXHJcblx0XHRcdCAqIEBtZXRob2QgQ2hhcnQuVGlja3MuZ2VuZXJhdG9ycy5saW5lYXJcclxuXHRcdFx0ICogQHBhcmFtIGdlbmVyYXRpb25PcHRpb25zIHtJTnVtZXJpY1RpY2tHZW5lcmF0aW9uT3B0aW9uc30gdGhlIG9wdGlvbnMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgdGlja3NcclxuXHRcdFx0ICogQHBhcmFtIGRhdGFSYW5nZSB7SVJhbmdlfSB0aGUgcmFuZ2Ugb2YgdGhlIGRhdGFcclxuXHRcdFx0ICogQHJldHVybnMge0FycmF5PE51bWJlcj59IGFycmF5IG9mIHRpY2sgdmFsdWVzXHJcblx0XHRcdCAqL1xyXG5cdFx0XHRsaW5lYXI6IGZ1bmN0aW9uKGdlbmVyYXRpb25PcHRpb25zLCBkYXRhUmFuZ2UpIHtcclxuXHRcdFx0XHR2YXIgdGlja3MgPSBbXTtcclxuXHRcdFx0XHQvLyBUbyBnZXQgYSBcIm5pY2VcIiB2YWx1ZSBmb3IgdGhlIHRpY2sgc3BhY2luZywgd2Ugd2lsbCB1c2UgdGhlIGFwcHJvcHJpYXRlbHkgbmFtZWRcclxuXHRcdFx0XHQvLyBcIm5pY2UgbnVtYmVyXCIgYWxnb3JpdGhtLiBTZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy84NTA2ODgxL25pY2UtbGFiZWwtYWxnb3JpdGhtLWZvci1jaGFydHMtd2l0aC1taW5pbXVtLXRpY2tzXHJcblx0XHRcdFx0Ly8gZm9yIGRldGFpbHMuXHJcblxyXG5cdFx0XHRcdHZhciBzcGFjaW5nO1xyXG5cdFx0XHRcdGlmIChnZW5lcmF0aW9uT3B0aW9ucy5zdGVwU2l6ZSAmJiBnZW5lcmF0aW9uT3B0aW9ucy5zdGVwU2l6ZSA+IDApIHtcclxuXHRcdFx0XHRcdHNwYWNpbmcgPSBnZW5lcmF0aW9uT3B0aW9ucy5zdGVwU2l6ZTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dmFyIG5pY2VSYW5nZSA9IGhlbHBlcnMubmljZU51bShkYXRhUmFuZ2UubWF4IC0gZGF0YVJhbmdlLm1pbiwgZmFsc2UpO1xyXG5cdFx0XHRcdFx0c3BhY2luZyA9IGhlbHBlcnMubmljZU51bShuaWNlUmFuZ2UgLyAoZ2VuZXJhdGlvbk9wdGlvbnMubWF4VGlja3MgLSAxKSwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHZhciBuaWNlTWluID0gTWF0aC5mbG9vcihkYXRhUmFuZ2UubWluIC8gc3BhY2luZykgKiBzcGFjaW5nO1xyXG5cdFx0XHRcdHZhciBuaWNlTWF4ID0gTWF0aC5jZWlsKGRhdGFSYW5nZS5tYXggLyBzcGFjaW5nKSAqIHNwYWNpbmc7XHJcblxyXG5cdFx0XHRcdC8vIElmIG1pbiwgbWF4IGFuZCBzdGVwU2l6ZSBpcyBzZXQgYW5kIHRoZXkgbWFrZSBhbiBldmVubHkgc3BhY2VkIHNjYWxlIHVzZSBpdC5cclxuXHRcdFx0XHRpZiAoZ2VuZXJhdGlvbk9wdGlvbnMubWluICYmIGdlbmVyYXRpb25PcHRpb25zLm1heCAmJiBnZW5lcmF0aW9uT3B0aW9ucy5zdGVwU2l6ZSkge1xyXG5cdFx0XHRcdFx0dmFyIG1pbk1heERlbHRhRGl2aXNpYmxlQnlTdGVwU2l6ZSA9ICgoZ2VuZXJhdGlvbk9wdGlvbnMubWF4IC0gZ2VuZXJhdGlvbk9wdGlvbnMubWluKSAlIGdlbmVyYXRpb25PcHRpb25zLnN0ZXBTaXplKSA9PT0gMDtcclxuXHRcdFx0XHRcdGlmIChtaW5NYXhEZWx0YURpdmlzaWJsZUJ5U3RlcFNpemUpIHtcclxuXHRcdFx0XHRcdFx0bmljZU1pbiA9IGdlbmVyYXRpb25PcHRpb25zLm1pbjtcclxuXHRcdFx0XHRcdFx0bmljZU1heCA9IGdlbmVyYXRpb25PcHRpb25zLm1heDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHZhciBudW1TcGFjZXMgPSAobmljZU1heCAtIG5pY2VNaW4pIC8gc3BhY2luZztcclxuXHRcdFx0XHQvLyBJZiB2ZXJ5IGNsb3NlIHRvIG91ciByb3VuZGVkIHZhbHVlLCB1c2UgaXQuXHJcblx0XHRcdFx0aWYgKGhlbHBlcnMuYWxtb3N0RXF1YWxzKG51bVNwYWNlcywgTWF0aC5yb3VuZChudW1TcGFjZXMpLCBzcGFjaW5nIC8gMTAwMCkpIHtcclxuXHRcdFx0XHRcdG51bVNwYWNlcyA9IE1hdGgucm91bmQobnVtU3BhY2VzKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bnVtU3BhY2VzID0gTWF0aC5jZWlsKG51bVNwYWNlcyk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBQdXQgdGhlIHZhbHVlcyBpbnRvIHRoZSB0aWNrcyBhcnJheVxyXG5cdFx0XHRcdHRpY2tzLnB1c2goZ2VuZXJhdGlvbk9wdGlvbnMubWluICE9PSB1bmRlZmluZWQgPyBnZW5lcmF0aW9uT3B0aW9ucy5taW4gOiBuaWNlTWluKTtcclxuXHRcdFx0XHRmb3IgKHZhciBqID0gMTsgaiA8IG51bVNwYWNlczsgKytqKSB7XHJcblx0XHRcdFx0XHR0aWNrcy5wdXNoKG5pY2VNaW4gKyAoaiAqIHNwYWNpbmcpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGlja3MucHVzaChnZW5lcmF0aW9uT3B0aW9ucy5tYXggIT09IHVuZGVmaW5lZCA/IGdlbmVyYXRpb25PcHRpb25zLm1heCA6IG5pY2VNYXgpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gdGlja3M7XHJcblx0XHRcdH0sXHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogR2VuZXJhdGUgYSBzZXQgb2YgbG9nYXJpdGhtaWMgdGlja3NcclxuXHRcdFx0ICogQG1ldGhvZCBDaGFydC5UaWNrcy5nZW5lcmF0b3JzLmxvZ2FyaXRobWljXHJcblx0XHRcdCAqIEBwYXJhbSBnZW5lcmF0aW9uT3B0aW9ucyB7SU51bWVyaWNUaWNrR2VuZXJhdGlvbk9wdGlvbnN9IHRoZSBvcHRpb25zIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHRpY2tzXHJcblx0XHRcdCAqIEBwYXJhbSBkYXRhUmFuZ2Uge0lSYW5nZX0gdGhlIHJhbmdlIG9mIHRoZSBkYXRhXHJcblx0XHRcdCAqIEByZXR1cm5zIHtBcnJheTxOdW1iZXI+fSBhcnJheSBvZiB0aWNrIHZhbHVlc1xyXG5cdFx0XHQgKi9cclxuXHRcdFx0bG9nYXJpdGhtaWM6IGZ1bmN0aW9uKGdlbmVyYXRpb25PcHRpb25zLCBkYXRhUmFuZ2UpIHtcclxuXHRcdFx0XHR2YXIgdGlja3MgPSBbXTtcclxuXHRcdFx0XHR2YXIgZ2V0VmFsdWVPckRlZmF1bHQgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0O1xyXG5cclxuXHRcdFx0XHQvLyBGaWd1cmUgb3V0IHdoYXQgdGhlIG1heCBudW1iZXIgb2YgdGlja3Mgd2UgY2FuIHN1cHBvcnQgaXQgaXMgYmFzZWQgb24gdGhlIHNpemUgb2ZcclxuXHRcdFx0XHQvLyB0aGUgYXhpcyBhcmVhLiBGb3Igbm93LCB3ZSBzYXkgdGhhdCB0aGUgbWluaW11bSB0aWNrIHNwYWNpbmcgaW4gcGl4ZWxzIG11c3QgYmUgNTBcclxuXHRcdFx0XHQvLyBXZSBhbHNvIGxpbWl0IHRoZSBtYXhpbXVtIG51bWJlciBvZiB0aWNrcyB0byAxMSB3aGljaCBnaXZlcyBhIG5pY2UgMTAgc3F1YXJlcyBvblxyXG5cdFx0XHRcdC8vIHRoZSBncmFwaFxyXG5cdFx0XHRcdHZhciB0aWNrVmFsID0gZ2V0VmFsdWVPckRlZmF1bHQoZ2VuZXJhdGlvbk9wdGlvbnMubWluLCBNYXRoLnBvdygxMCwgTWF0aC5mbG9vcihoZWxwZXJzLmxvZzEwKGRhdGFSYW5nZS5taW4pKSkpO1xyXG5cclxuXHRcdFx0XHR3aGlsZSAodGlja1ZhbCA8IGRhdGFSYW5nZS5tYXgpIHtcclxuXHRcdFx0XHRcdHRpY2tzLnB1c2godGlja1ZhbCk7XHJcblxyXG5cdFx0XHRcdFx0dmFyIGV4cDtcclxuXHRcdFx0XHRcdHZhciBzaWduaWZpY2FuZDtcclxuXHJcblx0XHRcdFx0XHRpZiAodGlja1ZhbCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRleHAgPSBNYXRoLmZsb29yKGhlbHBlcnMubG9nMTAoZGF0YVJhbmdlLm1pbk5vdFplcm8pKTtcclxuXHRcdFx0XHRcdFx0c2lnbmlmaWNhbmQgPSBNYXRoLnJvdW5kKGRhdGFSYW5nZS5taW5Ob3RaZXJvIC8gTWF0aC5wb3coMTAsIGV4cCkpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0ZXhwID0gTWF0aC5mbG9vcihoZWxwZXJzLmxvZzEwKHRpY2tWYWwpKTtcclxuXHRcdFx0XHRcdFx0c2lnbmlmaWNhbmQgPSBNYXRoLmZsb29yKHRpY2tWYWwgLyBNYXRoLnBvdygxMCwgZXhwKSkgKyAxO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmIChzaWduaWZpY2FuZCA9PT0gMTApIHtcclxuXHRcdFx0XHRcdFx0c2lnbmlmaWNhbmQgPSAxO1xyXG5cdFx0XHRcdFx0XHQrK2V4cDtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHR0aWNrVmFsID0gc2lnbmlmaWNhbmQgKiBNYXRoLnBvdygxMCwgZXhwKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHZhciBsYXN0VGljayA9IGdldFZhbHVlT3JEZWZhdWx0KGdlbmVyYXRpb25PcHRpb25zLm1heCwgdGlja1ZhbCk7XHJcblx0XHRcdFx0dGlja3MucHVzaChsYXN0VGljayk7XHJcblxyXG5cdFx0XHRcdHJldHVybiB0aWNrcztcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIE5hbWVzcGFjZSB0byBob2xkIGZvcm1hdHRlcnMgZm9yIGRpZmZlcmVudCB0eXBlcyBvZiB0aWNrc1xyXG5cdFx0ICogQG5hbWVzcGFjZSBDaGFydC5UaWNrcy5mb3JtYXR0ZXJzXHJcblx0XHQgKi9cclxuXHRcdGZvcm1hdHRlcnM6IHtcclxuXHRcdFx0LyoqXHJcblx0XHRcdCAqIEZvcm1hdHRlciBmb3IgdmFsdWUgbGFiZWxzXHJcblx0XHRcdCAqIEBtZXRob2QgQ2hhcnQuVGlja3MuZm9ybWF0dGVycy52YWx1ZXNcclxuXHRcdFx0ICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBkaXNwbGF5XHJcblx0XHRcdCAqIEByZXR1cm4ge1N0cmluZ3xBcnJheX0gdGhlIGxhYmVsIHRvIGRpc3BsYXlcclxuXHRcdFx0ICovXHJcblx0XHRcdHZhbHVlczogZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0XHRyZXR1cm4gaGVscGVycy5pc0FycmF5KHZhbHVlKSA/IHZhbHVlIDogJycgKyB2YWx1ZTtcclxuXHRcdFx0fSxcclxuXHJcblx0XHRcdC8qKlxyXG5cdFx0XHQgKiBGb3JtYXR0ZXIgZm9yIGxpbmVhciBudW1lcmljIHRpY2tzXHJcblx0XHRcdCAqIEBtZXRob2QgQ2hhcnQuVGlja3MuZm9ybWF0dGVycy5saW5lYXJcclxuXHRcdFx0ICogQHBhcmFtIHRpY2tWYWx1ZSB7TnVtYmVyfSB0aGUgdmFsdWUgdG8gYmUgZm9ybWF0dGVkXHJcblx0XHRcdCAqIEBwYXJhbSBpbmRleCB7TnVtYmVyfSB0aGUgcG9zaXRpb24gb2YgdGhlIHRpY2tWYWx1ZSBwYXJhbWV0ZXIgaW4gdGhlIHRpY2tzIGFycmF5XHJcblx0XHRcdCAqIEBwYXJhbSB0aWNrcyB7QXJyYXk8TnVtYmVyPn0gdGhlIGxpc3Qgb2YgdGlja3MgYmVpbmcgY29udmVydGVkXHJcblx0XHRcdCAqIEByZXR1cm4ge1N0cmluZ30gc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB0aWNrVmFsdWUgcGFyYW1ldGVyXHJcblx0XHRcdCAqL1xyXG5cdFx0XHRsaW5lYXI6IGZ1bmN0aW9uKHRpY2tWYWx1ZSwgaW5kZXgsIHRpY2tzKSB7XHJcblx0XHRcdFx0Ly8gSWYgd2UgaGF2ZSBsb3RzIG9mIHRpY2tzLCBkb24ndCB1c2UgdGhlIG9uZXNcclxuXHRcdFx0XHR2YXIgZGVsdGEgPSB0aWNrcy5sZW5ndGggPiAzID8gdGlja3NbMl0gLSB0aWNrc1sxXSA6IHRpY2tzWzFdIC0gdGlja3NbMF07XHJcblxyXG5cdFx0XHRcdC8vIElmIHdlIGhhdmUgYSBudW1iZXIgbGlrZSAyLjUgYXMgdGhlIGRlbHRhLCBmaWd1cmUgb3V0IGhvdyBtYW55IGRlY2ltYWwgcGxhY2VzIHdlIG5lZWRcclxuXHRcdFx0XHRpZiAoTWF0aC5hYnMoZGVsdGEpID4gMSkge1xyXG5cdFx0XHRcdFx0aWYgKHRpY2tWYWx1ZSAhPT0gTWF0aC5mbG9vcih0aWNrVmFsdWUpKSB7XHJcblx0XHRcdFx0XHRcdC8vIG5vdCBhbiBpbnRlZ2VyXHJcblx0XHRcdFx0XHRcdGRlbHRhID0gdGlja1ZhbHVlIC0gTWF0aC5mbG9vcih0aWNrVmFsdWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dmFyIGxvZ0RlbHRhID0gaGVscGVycy5sb2cxMChNYXRoLmFicyhkZWx0YSkpO1xyXG5cdFx0XHRcdHZhciB0aWNrU3RyaW5nID0gJyc7XHJcblxyXG5cdFx0XHRcdGlmICh0aWNrVmFsdWUgIT09IDApIHtcclxuXHRcdFx0XHRcdHZhciBudW1EZWNpbWFsID0gLTEgKiBNYXRoLmZsb29yKGxvZ0RlbHRhKTtcclxuXHRcdFx0XHRcdG51bURlY2ltYWwgPSBNYXRoLm1heChNYXRoLm1pbihudW1EZWNpbWFsLCAyMCksIDApOyAvLyB0b0ZpeGVkIGhhcyBhIG1heCBvZiAyMCBkZWNpbWFsIHBsYWNlc1xyXG5cdFx0XHRcdFx0dGlja1N0cmluZyA9IHRpY2tWYWx1ZS50b0ZpeGVkKG51bURlY2ltYWwpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aWNrU3RyaW5nID0gJzAnOyAvLyBuZXZlciBzaG93IGRlY2ltYWwgcGxhY2VzIGZvciAwXHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gdGlja1N0cmluZztcclxuXHRcdFx0fSxcclxuXHJcblx0XHRcdGxvZ2FyaXRobWljOiBmdW5jdGlvbih0aWNrVmFsdWUsIGluZGV4LCB0aWNrcykge1xyXG5cdFx0XHRcdHZhciByZW1haW4gPSB0aWNrVmFsdWUgLyAoTWF0aC5wb3coMTAsIE1hdGguZmxvb3IoaGVscGVycy5sb2cxMCh0aWNrVmFsdWUpKSkpO1xyXG5cclxuXHRcdFx0XHRpZiAodGlja1ZhbHVlID09PSAwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gJzAnO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAocmVtYWluID09PSAxIHx8IHJlbWFpbiA9PT0gMiB8fCByZW1haW4gPT09IDUgfHwgaW5kZXggPT09IDAgfHwgaW5kZXggPT09IHRpY2tzLmxlbmd0aCAtIDEpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0aWNrVmFsdWUudG9FeHBvbmVudGlhbCgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gJyc7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG59O1xyXG4iXX0=