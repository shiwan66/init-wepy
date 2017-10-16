'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;

	Chart.defaults.global.title = {
		display: false,
		position: 'top',
		fullWidth: true, // marks that this box should take the full width of the canvas (pushing down other boxes)

		fontStyle: 'bold',
		padding: 10,

		// actual title
		text: ''
	};

	var noop = helpers.noop;
	Chart.Title = Chart.Element.extend({

		initialize: function initialize(config) {
			var me = this;
			helpers.extend(me, config);
			me.options = helpers.configMerge(Chart.defaults.global.title, config.options);

			// Contains hit boxes for each dataset (in dataset order)
			me.legendHitBoxes = [];
		},

		// These methods are ordered by lifecycle. Utilities then follow.

		beforeUpdate: function beforeUpdate() {
			var chartOpts = this.chart.options;
			if (chartOpts && chartOpts.title) {
				this.options = helpers.configMerge(Chart.defaults.global.title, chartOpts.title);
			}
		},
		update: function update(maxWidth, maxHeight, margins) {
			var me = this;

			// Update Lifecycle - Probably don't want to ever extend or overwrite this function ;)
			me.beforeUpdate();

			// Absorb the master measurements
			me.maxWidth = maxWidth;
			me.maxHeight = maxHeight;
			me.margins = margins;

			// Dimensions
			me.beforeSetDimensions();
			me.setDimensions();
			me.afterSetDimensions();
			// Labels
			me.beforeBuildLabels();
			me.buildLabels();
			me.afterBuildLabels();

			// Fit
			me.beforeFit();
			me.fit();
			me.afterFit();
			//
			me.afterUpdate();

			return me.minSize;
		},
		afterUpdate: noop,

		//

		beforeSetDimensions: noop,
		setDimensions: function setDimensions() {
			var me = this;
			// Set the unconstrained dimension before label rotation
			if (me.isHorizontal()) {
				// Reset position before calculating rotation
				me.width = me.maxWidth;
				me.left = 0;
				me.right = me.width;
			} else {
				me.height = me.maxHeight;

				// Reset position before calculating rotation
				me.top = 0;
				me.bottom = me.height;
			}

			// Reset padding
			me.paddingLeft = 0;
			me.paddingTop = 0;
			me.paddingRight = 0;
			me.paddingBottom = 0;

			// Reset minSize
			me.minSize = {
				width: 0,
				height: 0
			};
		},
		afterSetDimensions: noop,

		//

		beforeBuildLabels: noop,
		buildLabels: noop,
		afterBuildLabels: noop,

		//

		beforeFit: noop,
		fit: function fit() {
			var me = this,
			    valueOrDefault = helpers.getValueOrDefault,
			    opts = me.options,
			    globalDefaults = Chart.defaults.global,
			    display = opts.display,
			    fontSize = valueOrDefault(opts.fontSize, globalDefaults.defaultFontSize),
			    minSize = me.minSize;

			if (me.isHorizontal()) {
				minSize.width = me.maxWidth; // fill all the width
				minSize.height = display ? fontSize + opts.padding * 2 : 0;
			} else {
				minSize.width = display ? fontSize + opts.padding * 2 : 0;
				minSize.height = me.maxHeight; // fill all the height
			}

			me.width = minSize.width;
			me.height = minSize.height;
		},
		afterFit: noop,

		// Shared Methods
		isHorizontal: function isHorizontal() {
			var pos = this.options.position;
			return pos === 'top' || pos === 'bottom';
		},

		// Actually draw the title block on the canvas
		draw: function draw() {
			var me = this,
			    ctx = me.ctx,
			    valueOrDefault = helpers.getValueOrDefault,
			    opts = me.options,
			    globalDefaults = Chart.defaults.global;

			if (opts.display) {
				var fontSize = valueOrDefault(opts.fontSize, globalDefaults.defaultFontSize),
				    fontStyle = valueOrDefault(opts.fontStyle, globalDefaults.defaultFontStyle),
				    fontFamily = valueOrDefault(opts.fontFamily, globalDefaults.defaultFontFamily),
				    titleFont = helpers.fontString(fontSize, fontStyle, fontFamily),
				    rotation = 0,
				    titleX,
				    titleY,
				    top = me.top,
				    left = me.left,
				    bottom = me.bottom,
				    right = me.right,
				    maxWidth;

				ctx.setFillStyle(valueOrDefault(opts.fontColor, globalDefaults.defaultFontColor)); // render in correct colour
				ctx.font = titleFont;
				ctx.setFontSize(fontSize);
				// Horizontal
				if (me.isHorizontal()) {
					titleX = left + (right - left) / 2; // midpoint of the width
					titleY = top + (bottom - top) / 2; // midpoint of the height
					maxWidth = right - left;
				} else {
					titleX = opts.position === 'left' ? left + fontSize / 2 : right - fontSize / 2;
					titleY = top + (bottom - top) / 2;
					maxWidth = bottom - top;
					rotation = Math.PI * (opts.position === 'left' ? -0.5 : 0.5);
				}

				ctx.save();
				ctx.translate(titleX, titleY);
				ctx.rotate(rotation);
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				var lgText = -2.9 * (opts.text + '').replace(/[^\x00-\xff]/g, "**").length; //todo
				ctx.fillText(opts.text, lgText, 0, maxWidth); //todo 标题往左偏一点
				ctx.restore();
			}
		}
	});

	// Register the title plugin
	Chart.plugins.register({
		beforeInit: function beforeInit(chartInstance) {
			var opts = chartInstance.options;
			var titleOpts = opts.title;

			if (titleOpts) {
				chartInstance.titleBlock = new Chart.Title({
					ctx: chartInstance.chart.ctx,
					options: titleOpts,
					chart: chartInstance
				});

				Chart.layoutService.addBox(chartInstance, chartInstance.titleBlock);
			}
		}
	});
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUudGl0bGUuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0cyIsIkNoYXJ0IiwiaGVscGVycyIsImRlZmF1bHRzIiwiZ2xvYmFsIiwidGl0bGUiLCJkaXNwbGF5IiwicG9zaXRpb24iLCJmdWxsV2lkdGgiLCJmb250U3R5bGUiLCJwYWRkaW5nIiwidGV4dCIsIm5vb3AiLCJUaXRsZSIsIkVsZW1lbnQiLCJleHRlbmQiLCJpbml0aWFsaXplIiwiY29uZmlnIiwibWUiLCJvcHRpb25zIiwiY29uZmlnTWVyZ2UiLCJsZWdlbmRIaXRCb3hlcyIsImJlZm9yZVVwZGF0ZSIsImNoYXJ0T3B0cyIsImNoYXJ0IiwidXBkYXRlIiwibWF4V2lkdGgiLCJtYXhIZWlnaHQiLCJtYXJnaW5zIiwiYmVmb3JlU2V0RGltZW5zaW9ucyIsInNldERpbWVuc2lvbnMiLCJhZnRlclNldERpbWVuc2lvbnMiLCJiZWZvcmVCdWlsZExhYmVscyIsImJ1aWxkTGFiZWxzIiwiYWZ0ZXJCdWlsZExhYmVscyIsImJlZm9yZUZpdCIsImZpdCIsImFmdGVyRml0IiwiYWZ0ZXJVcGRhdGUiLCJtaW5TaXplIiwiaXNIb3Jpem9udGFsIiwid2lkdGgiLCJsZWZ0IiwicmlnaHQiLCJoZWlnaHQiLCJ0b3AiLCJib3R0b20iLCJwYWRkaW5nTGVmdCIsInBhZGRpbmdUb3AiLCJwYWRkaW5nUmlnaHQiLCJwYWRkaW5nQm90dG9tIiwidmFsdWVPckRlZmF1bHQiLCJnZXRWYWx1ZU9yRGVmYXVsdCIsIm9wdHMiLCJnbG9iYWxEZWZhdWx0cyIsImZvbnRTaXplIiwiZGVmYXVsdEZvbnRTaXplIiwicG9zIiwiZHJhdyIsImN0eCIsImRlZmF1bHRGb250U3R5bGUiLCJmb250RmFtaWx5IiwiZGVmYXVsdEZvbnRGYW1pbHkiLCJ0aXRsZUZvbnQiLCJmb250U3RyaW5nIiwicm90YXRpb24iLCJ0aXRsZVgiLCJ0aXRsZVkiLCJzZXRGaWxsU3R5bGUiLCJmb250Q29sb3IiLCJkZWZhdWx0Rm9udENvbG9yIiwiZm9udCIsInNldEZvbnRTaXplIiwiTWF0aCIsIlBJIiwic2F2ZSIsInRyYW5zbGF0ZSIsInJvdGF0ZSIsInRleHRBbGlnbiIsInRleHRCYXNlbGluZSIsImxnVGV4dCIsInJlcGxhY2UiLCJsZW5ndGgiLCJmaWxsVGV4dCIsInJlc3RvcmUiLCJwbHVnaW5zIiwicmVnaXN0ZXIiLCJiZWZvcmVJbml0IiwiY2hhcnRJbnN0YW5jZSIsInRpdGxlT3B0cyIsInRpdGxlQmxvY2siLCJsYXlvdXRTZXJ2aWNlIiwiYWRkQm94Il0sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQUEsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxLQUFULEVBQWdCOztBQUVoQyxLQUFJQyxVQUFVRCxNQUFNQyxPQUFwQjs7QUFFQUQsT0FBTUUsUUFBTixDQUFlQyxNQUFmLENBQXNCQyxLQUF0QixHQUE4QjtBQUM3QkMsV0FBUyxLQURvQjtBQUU3QkMsWUFBVSxLQUZtQjtBQUc3QkMsYUFBVyxJQUhrQixFQUdaOztBQUVqQkMsYUFBVyxNQUxrQjtBQU03QkMsV0FBUyxFQU5vQjs7QUFRN0I7QUFDQUMsUUFBTTtBQVR1QixFQUE5Qjs7QUFZQSxLQUFJQyxPQUFPVixRQUFRVSxJQUFuQjtBQUNBWCxPQUFNWSxLQUFOLEdBQWNaLE1BQU1hLE9BQU4sQ0FBY0MsTUFBZCxDQUFxQjs7QUFFbENDLGNBQVksb0JBQVNDLE1BQVQsRUFBaUI7QUFDNUIsT0FBSUMsS0FBSyxJQUFUO0FBQ0FoQixXQUFRYSxNQUFSLENBQWVHLEVBQWYsRUFBbUJELE1BQW5CO0FBQ0FDLE1BQUdDLE9BQUgsR0FBYWpCLFFBQVFrQixXQUFSLENBQW9CbkIsTUFBTUUsUUFBTixDQUFlQyxNQUFmLENBQXNCQyxLQUExQyxFQUFpRFksT0FBT0UsT0FBeEQsQ0FBYjs7QUFFQTtBQUNBRCxNQUFHRyxjQUFILEdBQW9CLEVBQXBCO0FBQ0EsR0FUaUM7O0FBV2xDOztBQUVBQyxnQkFBYyx3QkFBVztBQUN4QixPQUFJQyxZQUFZLEtBQUtDLEtBQUwsQ0FBV0wsT0FBM0I7QUFDQSxP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ZixDQUF1QixlQUF2QixFQUF3QyxJQUF4QyxFQUE4Q0MsTUFBL0QsQ0FsQ2lCLENBa0NzRDtBQUN2RXZCLFFBQUl3QixRQUFKLENBQWE5QixLQUFLMUMsSUFBbEIsRUFBd0JxRSxNQUF4QixFQUFnQyxDQUFoQyxFQUFtQ3RELFFBQW5DLEVBbkNpQixDQW1DNEI7QUFDN0NpQyxRQUFJeUIsT0FBSjtBQUNBO0FBQ0Q7QUF4S2lDLEVBQXJCLENBQWQ7O0FBMktBO0FBQ0FuRixPQUFNb0YsT0FBTixDQUFjQyxRQUFkLENBQXVCO0FBQ3RCQyxjQUFZLG9CQUFTQyxhQUFULEVBQXdCO0FBQ25DLE9BQUluQyxPQUFPbUMsY0FBY3JFLE9BQXpCO0FBQ0EsT0FBSXNFLFlBQVlwQyxLQUFLaEQsS0FBckI7O0FBRUEsT0FBSW9GLFNBQUosRUFBZTtBQUNkRCxrQkFBY0UsVUFBZCxHQUEyQixJQUFJekYsTUFBTVksS0FBVixDQUFnQjtBQUMxQzhDLFVBQUs2QixjQUFjaEUsS0FBZCxDQUFvQm1DLEdBRGlCO0FBRTFDeEMsY0FBU3NFLFNBRmlDO0FBRzFDakUsWUFBT2dFO0FBSG1DLEtBQWhCLENBQTNCOztBQU1BdkYsVUFBTTBGLGFBQU4sQ0FBb0JDLE1BQXBCLENBQTJCSixhQUEzQixFQUEwQ0EsY0FBY0UsVUFBeEQ7QUFDQTtBQUNEO0FBZHFCLEVBQXZCO0FBZ0JBLENBN01EIiwiZmlsZSI6ImNvcmUudGl0bGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENoYXJ0KSB7XHJcblxyXG5cdHZhciBoZWxwZXJzID0gQ2hhcnQuaGVscGVycztcclxuXHJcblx0Q2hhcnQuZGVmYXVsdHMuZ2xvYmFsLnRpdGxlID0ge1xyXG5cdFx0ZGlzcGxheTogZmFsc2UsXHJcblx0XHRwb3NpdGlvbjogJ3RvcCcsXHJcblx0XHRmdWxsV2lkdGg6IHRydWUsIC8vIG1hcmtzIHRoYXQgdGhpcyBib3ggc2hvdWxkIHRha2UgdGhlIGZ1bGwgd2lkdGggb2YgdGhlIGNhbnZhcyAocHVzaGluZyBkb3duIG90aGVyIGJveGVzKVxyXG5cclxuXHRcdGZvbnRTdHlsZTogJ2JvbGQnLFxyXG5cdFx0cGFkZGluZzogMTAsXHJcblxyXG5cdFx0Ly8gYWN0dWFsIHRpdGxlXHJcblx0XHR0ZXh0OiAnJ1xyXG5cdH07XHJcblxyXG5cdHZhciBub29wID0gaGVscGVycy5ub29wO1xyXG5cdENoYXJ0LlRpdGxlID0gQ2hhcnQuRWxlbWVudC5leHRlbmQoe1xyXG5cclxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKGNvbmZpZykge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHRoZWxwZXJzLmV4dGVuZChtZSwgY29uZmlnKTtcclxuXHRcdFx0bWUub3B0aW9ucyA9IGhlbHBlcnMuY29uZmlnTWVyZ2UoQ2hhcnQuZGVmYXVsdHMuZ2xvYmFsLnRpdGxlLCBjb25maWcub3B0aW9ucyk7XHJcblxyXG5cdFx0XHQvLyBDb250YWlucyBoaXQgYm94ZXMgZm9yIGVhY2ggZGF0YXNldCAoaW4gZGF0YXNldCBvcmRlcilcclxuXHRcdFx0bWUubGVnZW5kSGl0Qm94ZXMgPSBbXTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gVGhlc2UgbWV0aG9kcyBhcmUgb3JkZXJlZCBieSBsaWZlY3ljbGUuIFV0aWxpdGllcyB0aGVuIGZvbGxvdy5cclxuXHJcblx0XHRiZWZvcmVVcGRhdGU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgY2hhcnRPcHRzID0gdGhpcy5jaGFydC5vcHRpb25zO1xyXG5cdFx0XHRpZiAoY2hhcnRPcHRzICYmIGNoYXJ0T3B0cy50aXRsZSkge1xyXG5cdFx0XHRcdHRoaXMub3B0aW9ucyA9IGhlbHBlcnMuY29uZmlnTWVyZ2UoQ2hhcnQuZGVmYXVsdHMuZ2xvYmFsLnRpdGxlLCBjaGFydE9wdHMudGl0bGUpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0dXBkYXRlOiBmdW5jdGlvbihtYXhXaWR0aCwgbWF4SGVpZ2h0LCBtYXJnaW5zKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgTGlmZWN5Y2xlIC0gUHJvYmFibHkgZG9uJ3Qgd2FudCB0byBldmVyIGV4dGVuZCBvciBvdmVyd3JpdGUgdGhpcyBmdW5jdGlvbiA7KVxyXG5cdFx0XHRtZS5iZWZvcmVVcGRhdGUoKTtcclxuXHJcblx0XHRcdC8vIEFic29yYiB0aGUgbWFzdGVyIG1lYXN1cmVtZW50c1xyXG5cdFx0XHRtZS5tYXhXaWR0aCA9IG1heFdpZHRoO1xyXG5cdFx0XHRtZS5tYXhIZWlnaHQgPSBtYXhIZWlnaHQ7XHJcblx0XHRcdG1lLm1hcmdpbnMgPSBtYXJnaW5zO1xyXG5cclxuXHRcdFx0Ly8gRGltZW5zaW9uc1xyXG5cdFx0XHRtZS5iZWZvcmVTZXREaW1lbnNpb25zKCk7XHJcblx0XHRcdG1lLnNldERpbWVuc2lvbnMoKTtcclxuXHRcdFx0bWUuYWZ0ZXJTZXREaW1lbnNpb25zKCk7XHJcblx0XHRcdC8vIExhYmVsc1xyXG5cdFx0XHRtZS5iZWZvcmVCdWlsZExhYmVscygpO1xyXG5cdFx0XHRtZS5idWlsZExhYmVscygpO1xyXG5cdFx0XHRtZS5hZnRlckJ1aWxkTGFiZWxzKCk7XHJcblxyXG5cdFx0XHQvLyBGaXRcclxuXHRcdFx0bWUuYmVmb3JlRml0KCk7XHJcblx0XHRcdG1lLmZpdCgpO1xyXG5cdFx0XHRtZS5hZnRlckZpdCgpO1xyXG5cdFx0XHQvL1xyXG5cdFx0XHRtZS5hZnRlclVwZGF0ZSgpO1xyXG5cclxuXHRcdFx0cmV0dXJuIG1lLm1pblNpemU7XHJcblxyXG5cdFx0fSxcclxuXHRcdGFmdGVyVXBkYXRlOiBub29wLFxyXG5cclxuXHRcdC8vXHJcblxyXG5cdFx0YmVmb3JlU2V0RGltZW5zaW9uczogbm9vcCxcclxuXHRcdHNldERpbWVuc2lvbnM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHQvLyBTZXQgdGhlIHVuY29uc3RyYWluZWQgZGltZW5zaW9uIGJlZm9yZSBsYWJlbCByb3RhdGlvblxyXG5cdFx0XHRpZiAobWUuaXNIb3Jpem9udGFsKCkpIHtcclxuXHRcdFx0XHQvLyBSZXNldCBwb3NpdGlvbiBiZWZvcmUgY2FsY3VsYXRpbmcgcm90YXRpb25cclxuXHRcdFx0XHRtZS53aWR0aCA9IG1lLm1heFdpZHRoO1xyXG5cdFx0XHRcdG1lLmxlZnQgPSAwO1xyXG5cdFx0XHRcdG1lLnJpZ2h0ID0gbWUud2lkdGg7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bWUuaGVpZ2h0ID0gbWUubWF4SGVpZ2h0O1xyXG5cclxuXHRcdFx0XHQvLyBSZXNldCBwb3NpdGlvbiBiZWZvcmUgY2FsY3VsYXRpbmcgcm90YXRpb25cclxuXHRcdFx0XHRtZS50b3AgPSAwO1xyXG5cdFx0XHRcdG1lLmJvdHRvbSA9IG1lLmhlaWdodDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVzZXQgcGFkZGluZ1xyXG5cdFx0XHRtZS5wYWRkaW5nTGVmdCA9IDA7XHJcblx0XHRcdG1lLnBhZGRpbmdUb3AgPSAwO1xyXG5cdFx0XHRtZS5wYWRkaW5nUmlnaHQgPSAwO1xyXG5cdFx0XHRtZS5wYWRkaW5nQm90dG9tID0gMDtcclxuXHJcblx0XHRcdC8vIFJlc2V0IG1pblNpemVcclxuXHRcdFx0bWUubWluU2l6ZSA9IHtcclxuXHRcdFx0XHR3aWR0aDogMCxcclxuXHRcdFx0XHRoZWlnaHQ6IDBcclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblx0XHRhZnRlclNldERpbWVuc2lvbnM6IG5vb3AsXHJcblxyXG5cdFx0Ly9cclxuXHJcblx0XHRiZWZvcmVCdWlsZExhYmVsczogbm9vcCxcclxuXHRcdGJ1aWxkTGFiZWxzOiBub29wLFxyXG5cdFx0YWZ0ZXJCdWlsZExhYmVsczogbm9vcCxcclxuXHJcblx0XHQvL1xyXG5cclxuXHRcdGJlZm9yZUZpdDogbm9vcCxcclxuXHRcdGZpdDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdFx0dmFsdWVPckRlZmF1bHQgPSBoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0LFxyXG5cdFx0XHRcdG9wdHMgPSBtZS5vcHRpb25zLFxyXG5cdFx0XHRcdGdsb2JhbERlZmF1bHRzID0gQ2hhcnQuZGVmYXVsdHMuZ2xvYmFsLFxyXG5cdFx0XHRcdGRpc3BsYXkgPSBvcHRzLmRpc3BsYXksXHJcblx0XHRcdFx0Zm9udFNpemUgPSB2YWx1ZU9yRGVmYXVsdChvcHRzLmZvbnRTaXplLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udFNpemUpLFxyXG5cdFx0XHRcdG1pblNpemUgPSBtZS5taW5TaXplO1xyXG5cclxuXHRcdFx0aWYgKG1lLmlzSG9yaXpvbnRhbCgpKSB7XHJcblx0XHRcdFx0bWluU2l6ZS53aWR0aCA9IG1lLm1heFdpZHRoOyAvLyBmaWxsIGFsbCB0aGUgd2lkdGhcclxuXHRcdFx0XHRtaW5TaXplLmhlaWdodCA9IGRpc3BsYXkgPyBmb250U2l6ZSArIChvcHRzLnBhZGRpbmcgKiAyKSA6IDA7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bWluU2l6ZS53aWR0aCA9IGRpc3BsYXkgPyBmb250U2l6ZSArIChvcHRzLnBhZGRpbmcgKiAyKSA6IDA7XHJcblx0XHRcdFx0bWluU2l6ZS5oZWlnaHQgPSBtZS5tYXhIZWlnaHQ7IC8vIGZpbGwgYWxsIHRoZSBoZWlnaHRcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bWUud2lkdGggPSBtaW5TaXplLndpZHRoO1xyXG5cdFx0XHRtZS5oZWlnaHQgPSBtaW5TaXplLmhlaWdodDtcclxuXHJcblx0XHR9LFxyXG5cdFx0YWZ0ZXJGaXQ6IG5vb3AsXHJcblxyXG5cdFx0Ly8gU2hhcmVkIE1ldGhvZHNcclxuXHRcdGlzSG9yaXpvbnRhbDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBwb3MgPSB0aGlzLm9wdGlvbnMucG9zaXRpb247XHJcblx0XHRcdHJldHVybiBwb3MgPT09ICd0b3AnIHx8IHBvcyA9PT0gJ2JvdHRvbSc7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIEFjdHVhbGx5IGRyYXcgdGhlIHRpdGxlIGJsb2NrIG9uIHRoZSBjYW52YXNcclxuXHRcdGRyYXc6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRcdGN0eCA9IG1lLmN0eCxcclxuXHRcdFx0XHR2YWx1ZU9yRGVmYXVsdCA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQsXHJcblx0XHRcdFx0b3B0cyA9IG1lLm9wdGlvbnMsXHJcblx0XHRcdFx0Z2xvYmFsRGVmYXVsdHMgPSBDaGFydC5kZWZhdWx0cy5nbG9iYWw7XHJcblxyXG5cdFx0XHRpZiAob3B0cy5kaXNwbGF5KSB7XHJcblx0XHRcdFx0dmFyIGZvbnRTaXplID0gdmFsdWVPckRlZmF1bHQob3B0cy5mb250U2l6ZSwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdEZvbnRTaXplKSxcclxuXHRcdFx0XHRcdGZvbnRTdHlsZSA9IHZhbHVlT3JEZWZhdWx0KG9wdHMuZm9udFN0eWxlLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udFN0eWxlKSxcclxuXHRcdFx0XHRcdGZvbnRGYW1pbHkgPSB2YWx1ZU9yRGVmYXVsdChvcHRzLmZvbnRGYW1pbHksIGdsb2JhbERlZmF1bHRzLmRlZmF1bHRGb250RmFtaWx5KSxcclxuXHRcdFx0XHRcdHRpdGxlRm9udCA9IGhlbHBlcnMuZm9udFN0cmluZyhmb250U2l6ZSwgZm9udFN0eWxlLCBmb250RmFtaWx5KSxcclxuXHRcdFx0XHRcdHJvdGF0aW9uID0gMCxcclxuXHRcdFx0XHRcdHRpdGxlWCxcclxuXHRcdFx0XHRcdHRpdGxlWSxcclxuXHRcdFx0XHRcdHRvcCA9IG1lLnRvcCxcclxuXHRcdFx0XHRcdGxlZnQgPSBtZS5sZWZ0LFxyXG5cdFx0XHRcdFx0Ym90dG9tID0gbWUuYm90dG9tLFxyXG5cdFx0XHRcdFx0cmlnaHQgPSBtZS5yaWdodCxcclxuXHRcdFx0XHRcdG1heFdpZHRoO1xyXG5cclxuXHRcdFx0XHRjdHguc2V0RmlsbFN0eWxlKHZhbHVlT3JEZWZhdWx0KG9wdHMuZm9udENvbG9yLCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Rm9udENvbG9yKSk7IC8vIHJlbmRlciBpbiBjb3JyZWN0IGNvbG91clxyXG5cdFx0XHRcdGN0eC5mb250ID0gdGl0bGVGb250O1xyXG5cdFx0XHRcdGN0eC5zZXRGb250U2l6ZShmb250U2l6ZSk7XHJcblx0XHRcdFx0Ly8gSG9yaXpvbnRhbFxyXG5cdFx0XHRcdGlmIChtZS5pc0hvcml6b250YWwoKSkge1xyXG5cdFx0XHRcdFx0dGl0bGVYID0gbGVmdCArICgocmlnaHQgLSBsZWZ0KSAvIDIpOyAvLyBtaWRwb2ludCBvZiB0aGUgd2lkdGhcclxuXHRcdFx0XHRcdHRpdGxlWSA9IHRvcCArICgoYm90dG9tIC0gdG9wKSAvIDIpOyAvLyBtaWRwb2ludCBvZiB0aGUgaGVpZ2h0XHJcblx0XHRcdFx0XHRtYXhXaWR0aCA9IHJpZ2h0IC0gbGVmdDtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGl0bGVYID0gb3B0cy5wb3NpdGlvbiA9PT0gJ2xlZnQnID8gbGVmdCArIChmb250U2l6ZSAvIDIpIDogcmlnaHQgLSAoZm9udFNpemUgLyAyKTtcclxuXHRcdFx0XHRcdHRpdGxlWSA9IHRvcCArICgoYm90dG9tIC0gdG9wKSAvIDIpO1xyXG5cdFx0XHRcdFx0bWF4V2lkdGggPSBib3R0b20gLSB0b3A7XHJcblx0XHRcdFx0XHRyb3RhdGlvbiA9IE1hdGguUEkgKiAob3B0cy5wb3NpdGlvbiA9PT0gJ2xlZnQnID8gLTAuNSA6IDAuNSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjdHguc2F2ZSgpO1xyXG5cdFx0XHRcdGN0eC50cmFuc2xhdGUodGl0bGVYLCB0aXRsZVkpO1xyXG5cdFx0XHRcdGN0eC5yb3RhdGUocm90YXRpb24pO1xyXG5cdFx0XHRcdGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuXHRcdFx0XHRjdHgudGV4dEJhc2VsaW5lID0gJ21pZGRsZSc7XHJcblx0XHRcdFx0dmFyIGxnVGV4dD0tMi45Kigob3B0cy50ZXh0KycnKS5yZXBsYWNlKC9bXlxceDAwLVxceGZmXS9nLCBcIioqXCIpLmxlbmd0aCk7Ly90b2RvXHJcblx0XHRcdFx0Y3R4LmZpbGxUZXh0KG9wdHMudGV4dCwgbGdUZXh0LCAwLCBtYXhXaWR0aCk7Ly90b2RvIOagh+mimOW+gOW3puWBj+S4gOeCuVxyXG5cdFx0XHRcdGN0eC5yZXN0b3JlKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gUmVnaXN0ZXIgdGhlIHRpdGxlIHBsdWdpblxyXG5cdENoYXJ0LnBsdWdpbnMucmVnaXN0ZXIoe1xyXG5cdFx0YmVmb3JlSW5pdDogZnVuY3Rpb24oY2hhcnRJbnN0YW5jZSkge1xyXG5cdFx0XHR2YXIgb3B0cyA9IGNoYXJ0SW5zdGFuY2Uub3B0aW9ucztcclxuXHRcdFx0dmFyIHRpdGxlT3B0cyA9IG9wdHMudGl0bGU7XHJcblxyXG5cdFx0XHRpZiAodGl0bGVPcHRzKSB7XHJcblx0XHRcdFx0Y2hhcnRJbnN0YW5jZS50aXRsZUJsb2NrID0gbmV3IENoYXJ0LlRpdGxlKHtcclxuXHRcdFx0XHRcdGN0eDogY2hhcnRJbnN0YW5jZS5jaGFydC5jdHgsXHJcblx0XHRcdFx0XHRvcHRpb25zOiB0aXRsZU9wdHMsXHJcblx0XHRcdFx0XHRjaGFydDogY2hhcnRJbnN0YW5jZVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRDaGFydC5sYXlvdXRTZXJ2aWNlLmFkZEJveChjaGFydEluc3RhbmNlLCBjaGFydEluc3RhbmNlLnRpdGxlQmxvY2spO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcbiJdfQ==