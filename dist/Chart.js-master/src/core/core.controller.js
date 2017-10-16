'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;

	// Create a dictionary of chart types, to allow for extension of existing types
	Chart.types = {};

	// Store a reference to each instance - allowing us to globally resize chart instances on window resize.
	// Destroy method on the chart will remove the instance of the chart from this reference.
	Chart.instances = {};

	// Controllers available for dataset visualization eg. bar, line, slice, etc.
	Chart.controllers = {};

	/**
  * The "used" size is the final value of a dimension property after all calculations have
  * been performed. This method uses the computed style of `element` but returns undefined
  * if the computed style is not expressed in pixels. That can happen in some cases where
  * `element` has a size relative to its parent and this last one is not yet displayed,
  * for example because of `display: none` on a parent node.
  * TODO(SB) Move this method in the upcoming core.platform class.
  * @see https://developer.mozilla.org/en-US/docs/Web/CSS/used_value
  * @returns {Number} Size in pixels or undefined if unknown.
  */
	function readUsedSize(element, property) {
		var value = helpers.getStyle(element, property);
		var matches = value && value.match(/(\d+)px/);
		return matches ? Number(matches[1]) : undefined;
	}

	/**
  * Initializes the canvas style and render size without modifying the canvas display size,
  * since responsiveness is handled by the controller.resize() method. The config is used
  * to determine the aspect ratio to apply in case no explicit height has been specified.
  * TODO(SB) Move this method in the upcoming core.platform class.
  */
	function initCanvas(canvas, config) {
		var style = canvas.style;

		// NOTE(SB) canvas.getAttribute('width') !== canvas.width: in the first case it
		// returns null or '' if no explicit value has been set to the canvas attribute.
		var renderHeight = canvas.getAttribute('height');
		var renderWidth = canvas.getAttribute('width');

		// Chart.js modifies some canvas values that we want to restore on destroy
		canvas._chartjs = {
			initial: {
				height: renderHeight,
				width: renderWidth,
				style: {
					display: style.display,
					height: style.height,
					width: style.width
				}
			}
		};

		// Force canvas to display as block to avoid extra space caused by inline
		// elements, which would interfere with the responsive resize process.
		// https://github.com/chartjs/Chart.js/issues/2538
		style.display = style.display || 'block';

		if (renderWidth === null || renderWidth === '') {
			var displayWidth = readUsedSize(canvas, 'width');
			if (displayWidth !== undefined) {
				canvas.width = displayWidth;
			}
		}

		if (renderHeight === null || renderHeight === '') {
			if (canvas.style.height === '') {
				// If no explicit render height and style height, let's apply the aspect ratio,
				// which one can be specified by the user but also by charts as default option
				// (i.e. options.aspectRatio). If not specified, use canvas aspect ratio of 2.
				canvas.height = canvas.width / (config.options.aspectRatio || 2);
			} else {
				var displayHeight = readUsedSize(canvas, 'height');
				if (displayWidth !== undefined) {
					canvas.height = displayHeight;
				}
			}
		}

		return canvas;
	}

	/**
  * Restores the canvas initial state, such as render/display sizes and style.
  * TODO(SB) Move this method in the upcoming core.platform class.
  */
	function releaseCanvas(canvas) {
		if (!canvas._chartjs) {
			return;
		}

		var initial = canvas._chartjs.initial;
		['height', 'width'].forEach(function (prop) {
			var value = initial[prop];
			if (value === undefined || value === null) {
				canvas.removeAttribute(prop);
			} else {
				canvas.setAttribute(prop, value);
			}
		});

		helpers.each(initial.style || {}, function (value, key) {
			canvas.style[key] = value;
		});

		delete canvas._chartjs;
	}

	/**
  * TODO(SB) Move this method in the upcoming core.platform class.
  */
	function acquireContext(item, config) {
		//适配微信小程序
		var context = item;
		var canvas = item.canvas;
		initCanvas(canvas, config);
		return context;
	}

	/**
  * Initializes the given config with global and chart default values.
  */
	function initConfig(config) {
		config = config || {};

		// Do NOT use configMerge() for the data object because this method merges arrays
		// and so would change references to labels and datasets, preventing data updates.
		var data = config.data = config.data || {};
		data.datasets = data.datasets || [];
		data.labels = data.labels || [];

		config.options = helpers.configMerge(Chart.defaults.global, Chart.defaults[config.type], config.options || {});

		return config;
	}

	/**
  * @class Chart.Controller
  * The main controller of a chart.
  */
	Chart.Controller = function (item, config, instance) {
		var me = this;

		config = initConfig(config);

		var context = acquireContext(item, config);
		var canvas = context && context.canvas;
		var height = canvas && canvas.height;
		var width = canvas && canvas.width;

		instance.ctx = context;
		instance.canvas = canvas;
		instance.config = config;
		instance.width = width;
		instance.height = height;
		instance.aspectRatio = height ? width / height : null;

		me.id = helpers.uid();
		me.chart = instance;
		me.config = config;
		me.options = config.options;
		me._bufferedRender = false;

		// Add the chart instance to the global namespace
		Chart.instances[me.id] = me;

		Object.defineProperty(me, 'data', {
			get: function get() {
				return me.config.data;
			}
		});

		if (!context || !canvas) {
			// The given item is not a compatible context2d element, let's return before finalizing
			// the chart initialization but after setting basic chart / controller properties that
			// can help to figure out that the chart is not valid (e.g chart.canvas !== null);
			// https://github.com/chartjs/Chart.js/issues/2807
			console.error("Failed to create chart: can't acquire context from the given item");
			return me;
		}

		helpers.retinaScale(instance);

		// Responsiveness is currently based on the use of an iframe, however this method causes
		// performance issues and could be troublesome when used with ad blockers. So make sure
		// that the user is still able to create a chart without iframe when responsive is false.
		// See https://github.com/chartjs/Chart.js/issues/2210
		if (me.options.responsive) {
			helpers.addResizeListener(canvas.parentNode, function () {
				me.resize();
			});

			// Initial resize before chart draws (must be silent to preserve initial animations).
			me.resize(true);
		}

		me.initialize();

		return me;
	};

	helpers.extend(Chart.Controller.prototype, /** @lends Chart.Controller */{
		initialize: function initialize() {
			var me = this;

			// Before init plugin notification
			Chart.plugins.notify('beforeInit', [me]);

			me.bindEvents();

			// Make sure controllers are built first so that each dataset is bound to an axis before the scales
			// are built
			me.ensureScalesHaveIDs();
			me.buildOrUpdateControllers();
			me.buildScales();
			me.updateLayout();
			me.resetElements();
			me.initToolTip();
			me.update();

			// After init plugin notification
			Chart.plugins.notify('afterInit', [me]);

			return me;
		},

		clear: function clear() {
			helpers.clear(this.chart);
			return this;
		},

		stop: function stop() {
			// Stops any current animation loop occurring
			Chart.animationService.cancelAnimation(this);
			return this;
		},

		resize: function resize(silent) {
			var me = this;
			var chart = me.chart;
			var options = me.options;
			var canvas = chart.canvas;
			var aspectRatio = options.maintainAspectRatio && chart.aspectRatio || null;

			// the canvas render width and height will be casted to integers so make sure that
			// the canvas display style uses the same integer values to avoid blurring effect.
			var newWidth = Math.floor(helpers.getMaximumWidth(canvas));
			var newHeight = Math.floor(aspectRatio ? newWidth / aspectRatio : helpers.getMaximumHeight(canvas));

			if (chart.width === newWidth && chart.height === newHeight) {
				return;
			}

			canvas.width = chart.width = newWidth;
			canvas.height = chart.height = newHeight;

			helpers.retinaScale(chart);

			canvas.style.width = newWidth + 'px';
			canvas.style.height = newHeight + 'px';

			// Notify any plugins about the resize
			var newSize = { width: newWidth, height: newHeight };
			Chart.plugins.notify('resize', [me, newSize]);

			// Notify of resize
			if (me.options.onResize) {
				me.options.onResize(me, newSize);
			}

			if (!silent) {
				me.stop();
				me.update(me.options.responsiveAnimationDuration);
			}
		},

		ensureScalesHaveIDs: function ensureScalesHaveIDs() {
			var options = this.options;
			var scalesOptions = options.scales || {};
			var scaleOptions = options.scale;

			helpers.each(scalesOptions.xAxes, function (xAxisOptions, index) {
				xAxisOptions.id = xAxisOptions.id || 'x-axis-' + index;
			});

			helpers.each(scalesOptions.yAxes, function (yAxisOptions, index) {
				yAxisOptions.id = yAxisOptions.id || 'y-axis-' + index;
			});

			if (scaleOptions) {
				scaleOptions.id = scaleOptions.id || 'scale';
			}
		},

		/**
   * Builds a map of scale ID to scale object for future lookup.
   */
		buildScales: function buildScales() {
			var me = this;
			var options = me.options;
			var scales = me.scales = {};
			var items = [];

			if (options.scales) {
				items = items.concat((options.scales.xAxes || []).map(function (xAxisOptions) {
					return { options: xAxisOptions, dtype: 'category' };
				}), (options.scales.yAxes || []).map(function (yAxisOptions) {
					return { options: yAxisOptions, dtype: 'linear' };
				}));
			}

			if (options.scale) {
				items.push({ options: options.scale, dtype: 'radialLinear', isDefault: true });
			}

			helpers.each(items, function (item) {
				var scaleOptions = item.options;
				var scaleType = helpers.getValueOrDefault(scaleOptions.type, item.dtype);
				var scaleClass = Chart.scaleService.getScaleConstructor(scaleType);
				if (!scaleClass) {
					return;
				}

				var scale = new scaleClass({
					id: scaleOptions.id,
					options: scaleOptions,
					ctx: me.chart.ctx,
					chart: me
				});

				scales[scale.id] = scale;

				// TODO(SB): I think we should be able to remove this custom case (options.scale)
				// and consider it as a regular scale part of the "scales"" map only! This would
				// make the logic easier and remove some useless? custom code.
				if (item.isDefault) {
					me.scale = scale;
				}
			});

			Chart.scaleService.addScalesToLayout(this);
		},

		updateLayout: function updateLayout() {
			Chart.layoutService.update(this, this.chart.width, this.chart.height);
		},

		buildOrUpdateControllers: function buildOrUpdateControllers() {
			var me = this;
			var types = [];
			var newControllers = [];

			helpers.each(me.data.datasets, function (dataset, datasetIndex) {
				var meta = me.getDatasetMeta(datasetIndex);
				if (!meta.type) {
					meta.type = dataset.type || me.config.type;
				}

				types.push(meta.type);

				if (meta.controller) {
					meta.controller.updateIndex(datasetIndex);
				} else {
					meta.controller = new Chart.controllers[meta.type](me, datasetIndex);
					newControllers.push(meta.controller);
				}
			}, me);

			if (types.length > 1) {
				for (var i = 1; i < types.length; i++) {
					if (types[i] !== types[i - 1]) {
						me.isCombo = true;
						break;
					}
				}
			}

			return newControllers;
		},

		/**
   * Reset the elements of all datasets
   * @method resetElements
   * @private
   */
		resetElements: function resetElements() {
			var me = this;
			helpers.each(me.data.datasets, function (dataset, datasetIndex) {
				me.getDatasetMeta(datasetIndex).controller.reset();
			}, me);
		},

		/**
  * Resets the chart back to it's state before the initial animation
  * @method reset
  */
		reset: function reset() {
			this.resetElements();
			this.tooltip.initialize();
		},

		update: function update(animationDuration, lazy) {
			var me = this;
			Chart.plugins.notify('beforeUpdate', [me]);

			// In case the entire data object changed
			me.tooltip._data = me.data;

			// Make sure dataset controllers are updated and new controllers are reset
			var newControllers = me.buildOrUpdateControllers();

			// Make sure all dataset controllers have correct meta data counts
			helpers.each(me.data.datasets, function (dataset, datasetIndex) {
				me.getDatasetMeta(datasetIndex).controller.buildOrUpdateElements();
			}, me);

			Chart.layoutService.update(me, me.chart.width, me.chart.height);

			// Apply changes to the datasets that require the scales to have been calculated i.e BorderColor changes
			Chart.plugins.notify('afterScaleUpdate', [me]);

			// Can only reset the new controllers after the scales have been updated
			helpers.each(newControllers, function (controller) {
				controller.reset();
			});

			me.updateDatasets();

			// Do this before render so that any plugins that need final scale updates can use it
			Chart.plugins.notify('afterUpdate', [me]);

			if (me._bufferedRender) {
				me._bufferedRequest = {
					lazy: lazy,
					duration: animationDuration
				};
			} else {
				me.render(animationDuration, lazy);
			}
		},

		/**
   * @method beforeDatasetsUpdate
   * @description Called before all datasets are updated. If a plugin returns false,
   * the datasets update will be cancelled until another chart update is triggered.
   * @param {Object} instance the chart instance being updated.
   * @returns {Boolean} false to cancel the datasets update.
   * @memberof Chart.PluginBase
   * @since version 2.1.5
   * @instance
   */

		/**
   * @method afterDatasetsUpdate
   * @description Called after all datasets have been updated. Note that this
   * extension will not be called if the datasets update has been cancelled.
   * @param {Object} instance the chart instance being updated.
   * @memberof Chart.PluginBase
   * @since version 2.1.5
   * @instance
   */

		/**
   * Updates all datasets unless a plugin returns false to the beforeDatasetsUpdate
   * extension, in which case no datasets will be updated and the afterDatasetsUpdate
   * notification will be skipped.
   * @protected
   * @instance
   */
		updateDatasets: function updateDatasets() {
			var me = this;
			var i, ilen;

			if (Chart.plugins.notify('beforeDatasetsUpdate', [me])) {
				for (i = 0, ilen = me.data.datasets.length; i < ilen; ++i) {
					me.getDatasetMeta(i).controller.update();
				}

				Chart.plugins.notify('afterDatasetsUpdate', [me]);
			}
		},

		render: function render(duration, lazy) {
			var me = this;
			Chart.plugins.notify('beforeRender', [me]);

			var animationOptions = me.options.animation;
			if (animationOptions && (typeof duration !== 'undefined' && duration !== 0 || typeof duration === 'undefined' && animationOptions.duration !== 0)) {
				var animation = new Chart.Animation();
				animation.numSteps = (duration || animationOptions.duration) / 16.66; // 60 fps
				animation.easing = animationOptions.easing;

				// render function
				animation.render = function (chartInstance, animationObject) {
					var easingFunction = helpers.easingEffects[animationObject.easing];
					var stepDecimal = animationObject.currentStep / animationObject.numSteps;
					var easeDecimal = easingFunction(stepDecimal);

					chartInstance.draw(easeDecimal, stepDecimal, animationObject.currentStep);
				};

				// user events
				animation.onAnimationProgress = animationOptions.onProgress;
				animation.onAnimationComplete = animationOptions.onComplete;

				Chart.animationService.addAnimation(me, animation, duration, lazy);
			} else {
				me.draw();
				if (animationOptions && animationOptions.onComplete && animationOptions.onComplete.call) {
					animationOptions.onComplete.call(me);
				}
			}
			return me;
		},

		draw: function draw(ease) {
			var me = this;
			var easingDecimal = ease || 1;
			me.clear();

			Chart.plugins.notify('beforeDraw', [me, easingDecimal]);

			// Draw all the scales
			helpers.each(me.boxes, function (box) {
				box.draw(me.chartArea, box); //todo 传入box用于区分x轴y轴
			}, me);
			if (me.scale) {
				me.scale.draw();
			}

			Chart.plugins.notify('beforeDatasetsDraw', [me, easingDecimal]);

			// Draw each dataset via its respective controller (reversed to support proper line stacking)
			helpers.each(me.data.datasets, function (dataset, datasetIndex) {
				if (me.isDatasetVisible(datasetIndex)) {
					me.getDatasetMeta(datasetIndex).controller.draw(ease);
				}
			}, me, true);

			Chart.plugins.notify('afterDatasetsDraw', [me, easingDecimal]);

			// Finally draw the tooltip
			me.tooltip.transition(easingDecimal).draw();

			Chart.plugins.notify('afterDraw', [me, easingDecimal]);
		},

		// Get the single element that was clicked on
		// @return : An object containing the dataset index and element index of the matching element. Also contains the rectangle that was draw
		getElementAtEvent: function getElementAtEvent(e) {
			return Chart.Interaction.modes.single(this, e);
		},

		getElementsAtEvent: function getElementsAtEvent(e) {
			return Chart.Interaction.modes.label(this, e, { intersect: true });
		},

		getElementsAtXAxis: function getElementsAtXAxis(e) {
			return Chart.Interaction.modes['x-axis'](this, e, { intersect: true });
		},

		getElementsAtEventForMode: function getElementsAtEventForMode(e, mode, options) {
			var method = Chart.Interaction.modes[mode];
			if (typeof method === 'function') {
				return method(this, e, options);
			}

			return [];
		},

		getDatasetAtEvent: function getDatasetAtEvent(e) {
			return Chart.Interaction.modes.dataset(this, e);
		},

		getDatasetMeta: function getDatasetMeta(datasetIndex) {
			var me = this;
			var dataset = me.data.datasets[datasetIndex];
			if (!dataset._meta) {
				dataset._meta = {};
			}

			var meta = dataset._meta[me.id];
			if (!meta) {
				meta = dataset._meta[me.id] = {
					type: null,
					data: [],
					dataset: null,
					controller: null,
					hidden: null, // See isDatasetVisible() comment
					xAxisID: null,
					yAxisID: null
				};
			}

			return meta;
		},

		getVisibleDatasetCount: function getVisibleDatasetCount() {
			var count = 0;
			for (var i = 0, ilen = this.data.datasets.length; i < ilen; ++i) {
				if (this.isDatasetVisible(i)) {
					count++;
				}
			}
			return count;
		},

		isDatasetVisible: function isDatasetVisible(datasetIndex) {
			var meta = this.getDatasetMeta(datasetIndex);

			// meta.hidden is a per chart dataset hidden flag override with 3 states: if true or false,
			// the dataset.hidden value is ignored, else if null, the dataset hidden state is returned.
			return typeof meta.hidden === 'boolean' ? !meta.hidden : !this.data.datasets[datasetIndex].hidden;
		},

		generateLegend: function generateLegend() {
			return this.options.legendCallback(this);
		},

		destroy: function destroy() {
			var me = this;
			var canvas = me.chart.canvas;
			var meta, i, ilen;

			me.stop();

			// dataset controllers need to cleanup associated data
			for (i = 0, ilen = me.data.datasets.length; i < ilen; ++i) {
				meta = me.getDatasetMeta(i);
				if (meta.controller) {
					meta.controller.destroy();
					meta.controller = null;
				}
			}

			if (canvas) {
				helpers.unbindEvents(me, me.events);
				helpers.removeResizeListener(canvas.parentNode);
				helpers.clear(me.chart);
				releaseCanvas(canvas);
				me.chart.canvas = null;
				me.chart.ctx = null;
			}

			// if we scaled the canvas in response to a devicePixelRatio !== 1, we need to undo that transform here
			if (me.chart.originalDevicePixelRatio !== undefined) {
				me.chart.ctx.scale(1 / me.chart.originalDevicePixelRatio, 1 / me.chart.originalDevicePixelRatio);
			}

			Chart.plugins.notify('destroy', [me]);

			delete Chart.instances[me.id];
		},

		toBase64Image: function toBase64Image() {
			return this.chart.canvas.toDataURL.apply(this.chart.canvas, arguments);
		},

		initToolTip: function initToolTip() {
			var me = this;
			me.tooltip = new Chart.Tooltip({
				_chart: me.chart,
				_chartInstance: me,
				_data: me.data,
				_options: me.options.tooltips
			}, me);
			me.tooltip.initialize();
		},

		bindEvents: function bindEvents() {
			var me = this;
			helpers.bindEvents(me, me.options.events, function (evt) {
				me.eventHandler(evt);
			});
		},

		updateHoverStyle: function updateHoverStyle(elements, mode, enabled) {
			var method = enabled ? 'setHoverStyle' : 'removeHoverStyle';
			var element, i, ilen;

			for (i = 0, ilen = elements.length; i < ilen; ++i) {
				element = elements[i];
				if (element) {
					this.getDatasetMeta(element._datasetIndex).controller[method](element);
				}
			}
		},

		eventHandler: function eventHandler(e) {
			var me = this;
			var hoverOptions = me.options.hover;

			// Buffer any update calls so that renders do not occur
			me._bufferedRender = true;
			me._bufferedRequest = null;

			var changed = me.handleEvent(e);
			changed |= me.legend.handleEvent(e);
			changed |= me.tooltip.handleEvent(e);

			var bufferedRequest = me._bufferedRequest;
			if (bufferedRequest) {
				// If we have an update that was triggered, we need to do a normal render
				me.render(bufferedRequest.duration, bufferedRequest.lazy);
			} else if (changed && !me.animating) {
				// If entering, leaving, or changing elements, animate the change via pivot
				me.stop();

				// We only need to render at this point. Updating will cause scales to be
				// recomputed generating flicker & using more memory than necessary.
				me.render(hoverOptions.animationDuration, true);
			}

			me._bufferedRender = false;
			me._bufferedRequest = null;

			return me;
		},

		/**
   * Handle an event
   * @private
   * param e {Event} the event to handle
   * @return {Boolean} true if the chart needs to re-render
   */
		handleEvent: function handleEvent(e) {
			var me = this;
			var options = me.options || {};
			var hoverOptions = options.hover;
			var changed = false;

			me.lastActive = me.lastActive || [];

			// Find Active Elements for hover and tooltips
			if (e.type === 'mouseout') {
				me.active = [];
			} else {
				me.active = me.getElementsAtEventForMode(e, hoverOptions.mode, hoverOptions);
			}

			// On Hover hook
			if (hoverOptions.onHover) {
				hoverOptions.onHover.call(me, me.active);
			}

			if (e.type === 'mouseup' || e.type === 'click') {
				if (options.onClick) {
					options.onClick.call(me, e, me.active);
				}
			}

			// Remove styling for last active (even if it may still be active)
			if (me.lastActive.length) {
				me.updateHoverStyle(me.lastActive, hoverOptions.mode, false);
			}

			// Built in hover styling
			if (me.active.length && hoverOptions.mode) {
				me.updateHoverStyle(me.active, hoverOptions.mode, true);
			}

			changed = !helpers.arrayEquals(me.active, me.lastActive);

			// Remember Last Actives
			me.lastActive = me.active;

			return changed;
		}
	});
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUuY29udHJvbGxlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwiQ2hhcnQiLCJoZWxwZXJzIiwidHlwZXMiLCJpbnN0YW5jZXMiLCJjb250cm9sbGVycyIsInJlYWRVc2VkU2l6ZSIsImVsZW1lbnQiLCJwcm9wZXJ0eSIsInZhbHVlIiwiZ2V0U3R5bGUiLCJtYXRjaGVzIiwibWF0Y2giLCJOdW1iZXIiLCJ1bmRlZmluZWQiLCJpbml0Q2FudmFzIiwiY2FudmFzIiwiY29uZmlnIiwic3R5bGUiLCJyZW5kZXJIZWlnaHQiLCJnZXRBdHRyaWJ1dGUiLCJyZW5kZXJXaWR0aCIsIl9jaGFydGpzIiwiaW5pdGlhbCIsImhlaWdodCIsIndpZHRoIiwiZGlzcGxheSIsImRpc3BsYXlXaWR0aCIsIm9wdGlvbnMiLCJhc3BlY3RSYXRpbyIsImRpc3BsYXlIZWlnaHQiLCJyZWxlYXNlQ2FudmFzIiwiZm9yRWFjaCIsInByb3AiLCJyZW1vdmVBdHRyaWJ1dGUiLCJzZXRBdHRyaWJ1dGUiLCJlYWNoIiwia2V5IiwiYWNxdWlyZUNvbnRleHQiLCJpdGVtIiwiY29udGV4dCIsImluaXRDb25maWciLCJkYXRhIiwiZGF0YXNldHMiLCJsYWJlbHMiLCJjb25maWdNZXJnZSIsImRlZmF1bHRzIiwiZ2xvYmFsIiwidHlwZSIsIkNvbnRyb2xsZXIiLCJpbnN0YW5jZSIsIm1lIiwiY3R4IiwiaWQiLCJ1aWQiLCJjaGFydCIsIl9idWZmZXJlZFJlbmRlciIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZ2V0IiwiY29uc29sZSIsImVycm9yIiwicmV0aW5hU2NhbGUiLCJyZXNwb25zaXZlIiwiYWRkUmVzaXplTGlzdGVuZXIiLCJwYXJlbnROb2RlIiwicmVzaXplIiwiaW5pdGlhbGl6ZSIsImV4dGVuZCIsInByb3RvdHlwZSIsInBsdWdpbnMiLCJub3RpZnkiLCJiaW5kRXZlbnRzIiwiZW5zdXJlU2NhbGVzSGF2ZUlEcyIsImJ1aWxkT3JVcGRhdGVDb250cm9sbGVycyIsImJ1aWxkU2NhbGVzIiwidXBkYXRlTGF5b3V0IiwicmVzZXRFbGVtZW50cyIsImluaXRUb29sVGlwIiwidXBkYXRlIiwiY2xlYXIiLCJzdG9wIiwiYW5pbWF0aW9uU2VydmljZSIsImNhbmNlbEFuaW1hdGlvbiIsInNpbGVudCIsIm1haW50YWluQXNwZWN0UmF0aW8iLCJuZXdXaWR0aCIsIk1hdGgiLCJmbG9vciIsImdldE1heGltdW1XaWR0aCIsIm5ld0hlaWdodCIsImdldE1heGltdW1IZWlnaHQiLCJuZXdTaXplIiwib25SZXNpemUiLCJyZXNwb25zaXZlQW5pbWF0aW9uRHVyYXRpb24iLCJzY2FsZXNPcHRpb25zIiwic2NhbGVzIiwic2NhbGVPcHRpb25zIiwic2NhbGUiLCJ4QXhlcyIsInhBeGlzT3B0aW9ucyIsImluZGV4IiwieUF4ZXMiLCJ5QXhpc09wdGlvbnMiLCJpdGVtcyIsImNvbmNhdCIsIm1hcCIsImR0eXBlIiwicHVzaCIsImlzRGVmYXVsdCIsInNjYWxlVHlwZSIsImdldFZhbHVlT3JEZWZhdWx0Iiwic2NhbGVDbGFzcyIsInNjYWxlU2VydmljZSIsImdldFNjYWxlQ29uc3RydWN0b3IiLCJhZGRTY2FsZXNUb0xheW91dCIsImxheW91dFNlcnZpY2UiLCJuZXdDb250cm9sbGVycyIsImRhdGFzZXQiLCJkYXRhc2V0SW5kZXgiLCJtZXRhIiwiZ2V0RGF0YXNldE1ldGEiLCJjb250cm9sbGVyIiwidXBkYXRlSW5kZXgiLCJsZW5ndGgiLCJpIiwiaXNDb21ibyIsInJlc2V0IiwidG9vbHRpcCIsImFuaW1hdGlvbkR1cmF0aW9uIiwibGF6eSIsIl9kYXRhIiwiYnVpbGRPclVwZGF0ZUVsZW1lbnRzIiwidXBkYXRlRGF0YXNldHMiLCJfYnVmZmVyZWRSZXF1ZXN0IiwiZHVyYXRpb24iLCJyZW5kZXIiLCJpbGVuIiwiYW5pbWF0aW9uT3B0aW9ucyIsImFuaW1hdGlvbiIsIkFuaW1hdGlvbiIsIm51bVN0ZXBzIiwiZWFzaW5nIiwiY2hhcnRJbnN0YW5jZSIsImFuaW1hdGlvbk9iamVjdCIsImVhc2luZ0Z1bmN0aW9uIiwiZWFzaW5nRWZmZWN0cyIsInN0ZXBEZWNpbWFsIiwiY3VycmVudFN0ZXAiLCJlYXNlRGVjaW1hbCIsImRyYXciLCJvbkFuaW1hdGlvblByb2dyZXNzIiwib25Qcm9ncmVzcyIsIm9uQW5pbWF0aW9uQ29tcGxldGUiLCJvbkNvbXBsZXRlIiwiYWRkQW5pbWF0aW9uIiwiY2FsbCIsImVhc2UiLCJlYXNpbmdEZWNpbWFsIiwiYm94ZXMiLCJib3giLCJjaGFydEFyZWEiLCJpc0RhdGFzZXRWaXNpYmxlIiwidHJhbnNpdGlvbiIsImdldEVsZW1lbnRBdEV2ZW50IiwiZSIsIkludGVyYWN0aW9uIiwibW9kZXMiLCJzaW5nbGUiLCJnZXRFbGVtZW50c0F0RXZlbnQiLCJsYWJlbCIsImludGVyc2VjdCIsImdldEVsZW1lbnRzQXRYQXhpcyIsImdldEVsZW1lbnRzQXRFdmVudEZvck1vZGUiLCJtb2RlIiwibWV0aG9kIiwiZ2V0RGF0YXNldEF0RXZlbnQiLCJfbWV0YSIsImhpZGRlbiIsInhBeGlzSUQiLCJ5QXhpc0lEIiwiZ2V0VmlzaWJsZURhdGFzZXRDb3VudCIsImNvdW50IiwiZ2VuZXJhdGVMZWdlbmQiLCJsZWdlbmRDYWxsYmFjayIsImRlc3Ryb3kiLCJ1bmJpbmRFdmVudHMiLCJldmVudHMiLCJyZW1vdmVSZXNpemVMaXN0ZW5lciIsIm9yaWdpbmFsRGV2aWNlUGl4ZWxSYXRpbyIsInRvQmFzZTY0SW1hZ2UiLCJ0b0RhdGFVUkwiLCJhcHBseSIsImFyZ3VtZW50cyIsIlRvb2x0aXAiLCJfY2hhcnQiLCJfY2hhcnRJbnN0YW5jZSIsIl9vcHRpb25zIiwidG9vbHRpcHMiLCJldnQiLCJldmVudEhhbmRsZXIiLCJ1cGRhdGVIb3ZlclN0eWxlIiwiZWxlbWVudHMiLCJlbmFibGVkIiwiX2RhdGFzZXRJbmRleCIsImhvdmVyT3B0aW9ucyIsImhvdmVyIiwiY2hhbmdlZCIsImhhbmRsZUV2ZW50IiwibGVnZW5kIiwiYnVmZmVyZWRSZXF1ZXN0IiwiYW5pbWF0aW5nIiwi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QUFqQixFQUEwQjtBQUN6QlQsaUJBQWFTLE9BQWIsQ0FBcUIxRCxJQUFyQixDQUEwQnpHLEVBQTFCLEVBQThCQSxHQUFHa0ssTUFBakM7QUFDQTs7QUFFRCxPQUFJaEQsRUFBRXJILElBQUYsS0FBVyxTQUFYLElBQXdCcUgsRUFBRXJILElBQUYsS0FBVyxPQUF2QyxFQUFnRDtBQUMvQyxRQUFJcEIsUUFBUTJMLE9BQVosRUFBcUI7QUFDcEIzTCxhQUFRMkwsT0FBUixDQUFnQjNELElBQWhCLENBQXFCekcsRUFBckIsRUFBeUJrSCxDQUF6QixFQUE0QmxILEdBQUdrSyxNQUEvQjtBQUNBO0FBQ0Q7O0FBRUQ7QUFDQSxPQUFJbEssR0FBR2lLLFVBQUgsQ0FBY3hGLE1BQWxCLEVBQTBCO0FBQ3pCekUsT0FBR3NKLGdCQUFILENBQW9CdEosR0FBR2lLLFVBQXZCLEVBQW1DUCxhQUFhL0IsSUFBaEQsRUFBc0QsS0FBdEQ7QUFDQTs7QUFFRDtBQUNBLE9BQUkzSCxHQUFHa0ssTUFBSCxDQUFVekYsTUFBVixJQUFvQmlGLGFBQWEvQixJQUFyQyxFQUEyQztBQUMxQzNILE9BQUdzSixnQkFBSCxDQUFvQnRKLEdBQUdrSyxNQUF2QixFQUErQlIsYUFBYS9CLElBQTVDLEVBQWtELElBQWxEO0FBQ0E7O0FBRURpQyxhQUFVLENBQUM3TSxRQUFRc04sV0FBUixDQUFvQnJLLEdBQUdrSyxNQUF2QixFQUErQmxLLEdBQUdpSyxVQUFsQyxDQUFYOztBQUVBO0FBQ0FqSyxNQUFHaUssVUFBSCxHQUFnQmpLLEdBQUdrSyxNQUFuQjs7QUFFQSxVQUFPTixPQUFQO0FBQ0E7QUExakJ3RSxFQUExRTtBQTRqQkEsQ0Ezd0JEIiwiZmlsZSI6ImNvcmUuY29udHJvbGxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oQ2hhcnQpIHtcclxuXHJcblx0dmFyIGhlbHBlcnMgPSBDaGFydC5oZWxwZXJzO1xyXG5cclxuXHQvLyBDcmVhdGUgYSBkaWN0aW9uYXJ5IG9mIGNoYXJ0IHR5cGVzLCB0byBhbGxvdyBmb3IgZXh0ZW5zaW9uIG9mIGV4aXN0aW5nIHR5cGVzXHJcblx0Q2hhcnQudHlwZXMgPSB7fTtcclxuXHJcblx0Ly8gU3RvcmUgYSByZWZlcmVuY2UgdG8gZWFjaCBpbnN0YW5jZSAtIGFsbG93aW5nIHVzIHRvIGdsb2JhbGx5IHJlc2l6ZSBjaGFydCBpbnN0YW5jZXMgb24gd2luZG93IHJlc2l6ZS5cclxuXHQvLyBEZXN0cm95IG1ldGhvZCBvbiB0aGUgY2hhcnQgd2lsbCByZW1vdmUgdGhlIGluc3RhbmNlIG9mIHRoZSBjaGFydCBmcm9tIHRoaXMgcmVmZXJlbmNlLlxyXG5cdENoYXJ0Lmluc3RhbmNlcyA9IHt9O1xyXG5cclxuXHQvLyBDb250cm9sbGVycyBhdmFpbGFibGUgZm9yIGRhdGFzZXQgdmlzdWFsaXphdGlvbiBlZy4gYmFyLCBsaW5lLCBzbGljZSwgZXRjLlxyXG5cdENoYXJ0LmNvbnRyb2xsZXJzID0ge307XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBcInVzZWRcIiBzaXplIGlzIHRoZSBmaW5hbCB2YWx1ZSBvZiBhIGRpbWVuc2lvbiBwcm9wZXJ0eSBhZnRlciBhbGwgY2FsY3VsYXRpb25zIGhhdmVcclxuXHQgKiBiZWVuIHBlcmZvcm1lZC4gVGhpcyBtZXRob2QgdXNlcyB0aGUgY29tcHV0ZWQgc3R5bGUgb2YgYGVsZW1lbnRgIGJ1dCByZXR1cm5zIHVuZGVmaW5lZFxyXG5cdCAqIGlmIHRoZSBjb21wdXRlZCBzdHlsZSBpcyBub3QgZXhwcmVzc2VkIGluIHBpeGVscy4gVGhhdCBjYW4gaGFwcGVuIGluIHNvbWUgY2FzZXMgd2hlcmVcclxuXHQgKiBgZWxlbWVudGAgaGFzIGEgc2l6ZSByZWxhdGl2ZSB0byBpdHMgcGFyZW50IGFuZCB0aGlzIGxhc3Qgb25lIGlzIG5vdCB5ZXQgZGlzcGxheWVkLFxyXG5cdCAqIGZvciBleGFtcGxlIGJlY2F1c2Ugb2YgYGRpc3BsYXk6IG5vbmVgIG9uIGEgcGFyZW50IG5vZGUuXHJcblx0ICogVE9ETyhTQikgTW92ZSB0aGlzIG1ldGhvZCBpbiB0aGUgdXBjb21pbmcgY29yZS5wbGF0Zm9ybSBjbGFzcy5cclxuXHQgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0NTUy91c2VkX3ZhbHVlXHJcblx0ICogQHJldHVybnMge051bWJlcn0gU2l6ZSBpbiBwaXhlbHMgb3IgdW5kZWZpbmVkIGlmIHVua25vd24uXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gcmVhZFVzZWRTaXplKGVsZW1lbnQsIHByb3BlcnR5KSB7XHJcblx0XHR2YXIgdmFsdWUgPSBoZWxwZXJzLmdldFN0eWxlKGVsZW1lbnQsIHByb3BlcnR5KTtcclxuXHRcdHZhciBtYXRjaGVzID0gdmFsdWUgJiYgdmFsdWUubWF0Y2goLyhcXGQrKXB4Lyk7XHJcblx0XHRyZXR1cm4gbWF0Y2hlcz8gTnVtYmVyKG1hdGNoZXNbMV0pIDogdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZXMgdGhlIGNhbnZhcyBzdHlsZSBhbmQgcmVuZGVyIHNpemUgd2l0aG91dCBtb2RpZnlpbmcgdGhlIGNhbnZhcyBkaXNwbGF5IHNpemUsXHJcblx0ICogc2luY2UgcmVzcG9uc2l2ZW5lc3MgaXMgaGFuZGxlZCBieSB0aGUgY29udHJvbGxlci5yZXNpemUoKSBtZXRob2QuIFRoZSBjb25maWcgaXMgdXNlZFxyXG5cdCAqIHRvIGRldGVybWluZSB0aGUgYXNwZWN0IHJhdGlvIHRvIGFwcGx5IGluIGNhc2Ugbm8gZXhwbGljaXQgaGVpZ2h0IGhhcyBiZWVuIHNwZWNpZmllZC5cclxuXHQgKiBUT0RPKFNCKSBNb3ZlIHRoaXMgbWV0aG9kIGluIHRoZSB1cGNvbWluZyBjb3JlLnBsYXRmb3JtIGNsYXNzLlxyXG5cdCAqL1xyXG5cdGZ1bmN0aW9uIGluaXRDYW52YXMoY2FudmFzLCBjb25maWcpIHtcclxuXHRcdHZhciBzdHlsZSA9IGNhbnZhcy5zdHlsZTtcclxuXHJcblx0XHQvLyBOT1RFKFNCKSBjYW52YXMuZ2V0QXR0cmlidXRlKCd3aWR0aCcpICE9PSBjYW52YXMud2lkdGg6IGluIHRoZSBmaXJzdCBjYXNlIGl0XHJcblx0XHQvLyByZXR1cm5zIG51bGwgb3IgJycgaWYgbm8gZXhwbGljaXQgdmFsdWUgaGFzIGJlZW4gc2V0IHRvIHRoZSBjYW52YXMgYXR0cmlidXRlLlxyXG5cdFx0dmFyIHJlbmRlckhlaWdodCA9IGNhbnZhcy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpO1xyXG5cdFx0dmFyIHJlbmRlcldpZHRoID0gY2FudmFzLmdldEF0dHJpYnV0ZSgnd2lkdGgnKTtcclxuXHJcblx0XHQvLyBDaGFydC5qcyBtb2RpZmllcyBzb21lIGNhbnZhcyB2YWx1ZXMgdGhhdCB3ZSB3YW50IHRvIHJlc3RvcmUgb24gZGVzdHJveVxyXG5cdFx0Y2FudmFzLl9jaGFydGpzID0ge1xyXG5cdFx0XHRpbml0aWFsOiB7XHJcblx0XHRcdFx0aGVpZ2h0OiByZW5kZXJIZWlnaHQsXHJcblx0XHRcdFx0d2lkdGg6IHJlbmRlcldpZHRoLFxyXG5cdFx0XHRcdHN0eWxlOiB7XHJcblx0XHRcdFx0XHRkaXNwbGF5OiBzdHlsZS5kaXNwbGF5LFxyXG5cdFx0XHRcdFx0aGVpZ2h0OiBzdHlsZS5oZWlnaHQsXHJcblx0XHRcdFx0XHR3aWR0aDogc3R5bGUud2lkdGhcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gRm9yY2UgY2FudmFzIHRvIGRpc3BsYXkgYXMgYmxvY2sgdG8gYXZvaWQgZXh0cmEgc3BhY2UgY2F1c2VkIGJ5IGlubGluZVxyXG5cdFx0Ly8gZWxlbWVudHMsIHdoaWNoIHdvdWxkIGludGVyZmVyZSB3aXRoIHRoZSByZXNwb25zaXZlIHJlc2l6ZSBwcm9jZXNzLlxyXG5cdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2NoYXJ0anMvQ2hhcnQuanMvaXNzdWVzLzI1MzhcclxuXHRcdHN0eWxlLmRpc3BsYXkgPSBzdHlsZS5kaXNwbGF5IHx8ICdibG9jayc7XHJcblxyXG5cdFx0aWYgKHJlbmRlcldpZHRoID09PSBudWxsIHx8IHJlbmRlcldpZHRoID09PSAnJykge1xyXG5cdFx0XHR2YXIgZGlzcGxheVdpZHRoID0gcmVhZFVzZWRTaXplKGNhbnZhcywgJ3dpZHRoJyk7XHJcblx0XHRcdGlmIChkaXNwbGF5V2lkdGggIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdGNhbnZhcy53aWR0aCA9IGRpc3BsYXlXaWR0aDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChyZW5kZXJIZWlnaHQgPT09IG51bGwgfHwgcmVuZGVySGVpZ2h0ID09PSAnJykge1xyXG5cdFx0XHRpZiAoY2FudmFzLnN0eWxlLmhlaWdodCA9PT0gJycpIHtcclxuXHRcdFx0XHQvLyBJZiBubyBleHBsaWNpdCByZW5kZXIgaGVpZ2h0IGFuZCBzdHlsZSBoZWlnaHQsIGxldCdzIGFwcGx5IHRoZSBhc3BlY3QgcmF0aW8sXHJcblx0XHRcdFx0Ly8gd2hpY2ggb25lIGNhbiBiZSBzcGVjaWZpZWQgYnkgdGhlIHVzZXIgYnV0IGFsc28gYnkgY2hhcnRzIGFzIGRlZmF1bHQgb3B0aW9uXHJcblx0XHRcdFx0Ly8gKGkuZS4gb3B0aW9ucy5hc3BlY3RSYXRpbykuIElmIG5vdCBzcGVjaWZpZWQsIHVzZSBjYW52YXMgYXNwZWN0IHJhdGlvIG9mIDIuXHJcblx0XHRcdFx0Y2FudmFzLmhlaWdodCA9IGNhbnZhcy53aWR0aCAvIChjb25maWcub3B0aW9ucy5hc3BlY3RSYXRpbyB8fCAyKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR2YXIgZGlzcGxheUhlaWdodCA9IHJlYWRVc2VkU2l6ZShjYW52YXMsICdoZWlnaHQnKTtcclxuXHRcdFx0XHRpZiAoZGlzcGxheVdpZHRoICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRcdGNhbnZhcy5oZWlnaHQgPSBkaXNwbGF5SGVpZ2h0O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBjYW52YXM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZXN0b3JlcyB0aGUgY2FudmFzIGluaXRpYWwgc3RhdGUsIHN1Y2ggYXMgcmVuZGVyL2Rpc3BsYXkgc2l6ZXMgYW5kIHN0eWxlLlxyXG5cdCAqIFRPRE8oU0IpIE1vdmUgdGhpcyBtZXRob2QgaW4gdGhlIHVwY29taW5nIGNvcmUucGxhdGZvcm0gY2xhc3MuXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gcmVsZWFzZUNhbnZhcyhjYW52YXMpIHtcclxuXHRcdGlmICghY2FudmFzLl9jaGFydGpzKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgaW5pdGlhbCA9IGNhbnZhcy5fY2hhcnRqcy5pbml0aWFsO1xyXG5cdFx0WydoZWlnaHQnLCAnd2lkdGgnXS5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcclxuXHRcdFx0dmFyIHZhbHVlID0gaW5pdGlhbFtwcm9wXTtcclxuXHRcdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIHtcclxuXHRcdFx0XHRjYW52YXMucmVtb3ZlQXR0cmlidXRlKHByb3ApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNhbnZhcy5zZXRBdHRyaWJ1dGUocHJvcCwgdmFsdWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRoZWxwZXJzLmVhY2goaW5pdGlhbC5zdHlsZSB8fCB7fSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xyXG5cdFx0XHRjYW52YXMuc3R5bGVba2V5XSA9IHZhbHVlO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZGVsZXRlIGNhbnZhcy5fY2hhcnRqcztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRPRE8oU0IpIE1vdmUgdGhpcyBtZXRob2QgaW4gdGhlIHVwY29taW5nIGNvcmUucGxhdGZvcm0gY2xhc3MuXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gYWNxdWlyZUNvbnRleHQoaXRlbSwgY29uZmlnKSB7Ly/pgILphY3lvq7kv6HlsI/nqIvluo9cclxuXHRcdHZhciBjb250ZXh0PWl0ZW07XHJcblx0XHR2YXIgY2FudmFzPWl0ZW0uY2FudmFzO1xyXG5cdFx0aW5pdENhbnZhcyhjYW52YXMsIGNvbmZpZyk7XHJcblx0XHRyZXR1cm4gY29udGV4dFxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZXMgdGhlIGdpdmVuIGNvbmZpZyB3aXRoIGdsb2JhbCBhbmQgY2hhcnQgZGVmYXVsdCB2YWx1ZXMuXHJcblx0ICovXHJcblx0ZnVuY3Rpb24gaW5pdENvbmZpZyhjb25maWcpIHtcclxuXHRcdGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuXHJcblx0XHQvLyBEbyBOT1QgdXNlIGNvbmZpZ01lcmdlKCkgZm9yIHRoZSBkYXRhIG9iamVjdCBiZWNhdXNlIHRoaXMgbWV0aG9kIG1lcmdlcyBhcnJheXNcclxuXHRcdC8vIGFuZCBzbyB3b3VsZCBjaGFuZ2UgcmVmZXJlbmNlcyB0byBsYWJlbHMgYW5kIGRhdGFzZXRzLCBwcmV2ZW50aW5nIGRhdGEgdXBkYXRlcy5cclxuXHRcdHZhciBkYXRhID0gY29uZmlnLmRhdGEgPSBjb25maWcuZGF0YSB8fCB7fTtcclxuXHRcdGRhdGEuZGF0YXNldHMgPSBkYXRhLmRhdGFzZXRzIHx8IFtdO1xyXG5cdFx0ZGF0YS5sYWJlbHMgPSBkYXRhLmxhYmVscyB8fCBbXTtcclxuXHJcblx0XHRjb25maWcub3B0aW9ucyA9IGhlbHBlcnMuY29uZmlnTWVyZ2UoXHJcblx0XHRcdENoYXJ0LmRlZmF1bHRzLmdsb2JhbCxcclxuXHRcdFx0Q2hhcnQuZGVmYXVsdHNbY29uZmlnLnR5cGVdLFxyXG5cdFx0XHRjb25maWcub3B0aW9ucyB8fCB7fSk7XHJcblxyXG5cdFx0cmV0dXJuIGNvbmZpZztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEBjbGFzcyBDaGFydC5Db250cm9sbGVyXHJcblx0ICogVGhlIG1haW4gY29udHJvbGxlciBvZiBhIGNoYXJ0LlxyXG5cdCAqL1xyXG5cdENoYXJ0LkNvbnRyb2xsZXIgPSBmdW5jdGlvbihpdGVtLCBjb25maWcsIGluc3RhbmNlKSB7XHJcblx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cclxuXHRcdGNvbmZpZyA9IGluaXRDb25maWcoY29uZmlnKTtcclxuXHJcblx0XHR2YXIgY29udGV4dCA9IGFjcXVpcmVDb250ZXh0KGl0ZW0sIGNvbmZpZyk7XHJcblx0XHR2YXIgY2FudmFzID0gY29udGV4dCAmJiBjb250ZXh0LmNhbnZhcztcclxuXHRcdHZhciBoZWlnaHQgPSBjYW52YXMgJiYgY2FudmFzLmhlaWdodDtcclxuXHRcdHZhciB3aWR0aCA9IGNhbnZhcyAmJiBjYW52YXMud2lkdGg7XHJcblxyXG5cdFx0aW5zdGFuY2UuY3R4ID0gY29udGV4dDtcclxuXHRcdGluc3RhbmNlLmNhbnZhcyA9IGNhbnZhcztcclxuXHRcdGluc3RhbmNlLmNvbmZpZyA9IGNvbmZpZztcclxuXHRcdGluc3RhbmNlLndpZHRoID0gd2lkdGg7XHJcblx0XHRpbnN0YW5jZS5oZWlnaHQgPSBoZWlnaHQ7XHJcblx0XHRpbnN0YW5jZS5hc3BlY3RSYXRpbyA9IGhlaWdodD8gd2lkdGggLyBoZWlnaHQgOiBudWxsO1xyXG5cclxuXHRcdG1lLmlkID0gaGVscGVycy51aWQoKTtcclxuXHRcdG1lLmNoYXJ0ID0gaW5zdGFuY2U7XHJcblx0XHRtZS5jb25maWcgPSBjb25maWc7XHJcblx0XHRtZS5vcHRpb25zID0gY29uZmlnLm9wdGlvbnM7XHJcblx0XHRtZS5fYnVmZmVyZWRSZW5kZXIgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBBZGQgdGhlIGNoYXJ0IGluc3RhbmNlIHRvIHRoZSBnbG9iYWwgbmFtZXNwYWNlXHJcblx0XHRDaGFydC5pbnN0YW5jZXNbbWUuaWRdID0gbWU7XHJcblxyXG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG1lLCAnZGF0YScsIHtcclxuXHRcdFx0Z2V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRyZXR1cm4gbWUuY29uZmlnLmRhdGE7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmICghY29udGV4dCB8fCAhY2FudmFzKSB7XHJcblx0XHRcdC8vIFRoZSBnaXZlbiBpdGVtIGlzIG5vdCBhIGNvbXBhdGlibGUgY29udGV4dDJkIGVsZW1lbnQsIGxldCdzIHJldHVybiBiZWZvcmUgZmluYWxpemluZ1xyXG5cdFx0XHQvLyB0aGUgY2hhcnQgaW5pdGlhbGl6YXRpb24gYnV0IGFmdGVyIHNldHRpbmcgYmFzaWMgY2hhcnQgLyBjb250cm9sbGVyIHByb3BlcnRpZXMgdGhhdFxyXG5cdFx0XHQvLyBjYW4gaGVscCB0byBmaWd1cmUgb3V0IHRoYXQgdGhlIGNoYXJ0IGlzIG5vdCB2YWxpZCAoZS5nIGNoYXJ0LmNhbnZhcyAhPT0gbnVsbCk7XHJcblx0XHRcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9jaGFydGpzL0NoYXJ0LmpzL2lzc3Vlcy8yODA3XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gY3JlYXRlIGNoYXJ0OiBjYW4ndCBhY3F1aXJlIGNvbnRleHQgZnJvbSB0aGUgZ2l2ZW4gaXRlbVwiKTtcclxuXHRcdFx0cmV0dXJuIG1lO1xyXG5cdFx0fVxyXG5cclxuXHRcdGhlbHBlcnMucmV0aW5hU2NhbGUoaW5zdGFuY2UpO1xyXG5cclxuXHRcdC8vIFJlc3BvbnNpdmVuZXNzIGlzIGN1cnJlbnRseSBiYXNlZCBvbiB0aGUgdXNlIG9mIGFuIGlmcmFtZSwgaG93ZXZlciB0aGlzIG1ldGhvZCBjYXVzZXNcclxuXHRcdC8vIHBlcmZvcm1hbmNlIGlzc3VlcyBhbmQgY291bGQgYmUgdHJvdWJsZXNvbWUgd2hlbiB1c2VkIHdpdGggYWQgYmxvY2tlcnMuIFNvIG1ha2Ugc3VyZVxyXG5cdFx0Ly8gdGhhdCB0aGUgdXNlciBpcyBzdGlsbCBhYmxlIHRvIGNyZWF0ZSBhIGNoYXJ0IHdpdGhvdXQgaWZyYW1lIHdoZW4gcmVzcG9uc2l2ZSBpcyBmYWxzZS5cclxuXHRcdC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vY2hhcnRqcy9DaGFydC5qcy9pc3N1ZXMvMjIxMFxyXG5cdFx0aWYgKG1lLm9wdGlvbnMucmVzcG9uc2l2ZSkge1xyXG5cdFx0XHRoZWxwZXJzLmFkZFJlc2l6ZUxpc3RlbmVyKGNhbnZhcy5wYXJlbnROb2RlLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRtZS5yZXNpemUoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBJbml0aWFsIHJlc2l6ZSBiZWZvcmUgY2hhcnQgZHJhd3MgKG11c3QgYmUgc2lsZW50IHRvIHByZXNlcnZlIGluaXRpYWwgYW5pbWF0aW9ucykuXHJcblx0XHRcdG1lLnJlc2l6ZSh0cnVlKTtcclxuXHRcdH1cclxuXHJcblx0XHRtZS5pbml0aWFsaXplKCk7XHJcblxyXG5cdFx0cmV0dXJuIG1lO1xyXG5cdH07XHJcblxyXG5cdGhlbHBlcnMuZXh0ZW5kKENoYXJ0LkNvbnRyb2xsZXIucHJvdG90eXBlLCAvKiogQGxlbmRzIENoYXJ0LkNvbnRyb2xsZXIgKi8ge1xyXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblxyXG5cdFx0XHQvLyBCZWZvcmUgaW5pdCBwbHVnaW4gbm90aWZpY2F0aW9uXHJcblx0XHRcdENoYXJ0LnBsdWdpbnMubm90aWZ5KCdiZWZvcmVJbml0JywgW21lXSk7XHJcblxyXG5cdFx0XHRtZS5iaW5kRXZlbnRzKCk7XHJcblxyXG5cdFx0XHQvLyBNYWtlIHN1cmUgY29udHJvbGxlcnMgYXJlIGJ1aWx0IGZpcnN0IHNvIHRoYXQgZWFjaCBkYXRhc2V0IGlzIGJvdW5kIHRvIGFuIGF4aXMgYmVmb3JlIHRoZSBzY2FsZXNcclxuXHRcdFx0Ly8gYXJlIGJ1aWx0XHJcblx0XHRcdG1lLmVuc3VyZVNjYWxlc0hhdmVJRHMoKTtcclxuXHRcdFx0bWUuYnVpbGRPclVwZGF0ZUNvbnRyb2xsZXJzKCk7XHJcblx0XHRcdG1lLmJ1aWxkU2NhbGVzKCk7XHJcblx0XHRcdG1lLnVwZGF0ZUxheW91dCgpO1xyXG5cdFx0XHRtZS5yZXNldEVsZW1lbnRzKCk7XHJcblx0XHRcdG1lLmluaXRUb29sVGlwKCk7XHJcblx0XHRcdG1lLnVwZGF0ZSgpO1xyXG5cclxuXHRcdFx0Ly8gQWZ0ZXIgaW5pdCBwbHVnaW4gbm90aWZpY2F0aW9uXHJcblx0XHRcdENoYXJ0LnBsdWdpbnMubm90aWZ5KCdhZnRlckluaXQnLCBbbWVdKTtcclxuXHJcblx0XHRcdHJldHVybiBtZTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Y2xlYXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRoZWxwZXJzLmNsZWFyKHRoaXMuY2hhcnQpO1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH0sXHJcblxyXG5cdFx0c3RvcDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdC8vIFN0b3BzIGFueSBjdXJyZW50IGFuaW1hdGlvbiBsb29wIG9jY3VycmluZ1xyXG5cdFx0XHRDaGFydC5hbmltYXRpb25TZXJ2aWNlLmNhbmNlbEFuaW1hdGlvbih0aGlzKTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9LFxyXG5cclxuXHRcdHJlc2l6ZTogZnVuY3Rpb24oc2lsZW50KSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBjaGFydCA9IG1lLmNoYXJ0O1xyXG5cdFx0XHR2YXIgb3B0aW9ucyA9IG1lLm9wdGlvbnM7XHJcblx0XHRcdHZhciBjYW52YXMgPSBjaGFydC5jYW52YXM7XHJcblx0XHRcdHZhciBhc3BlY3RSYXRpbyA9IChvcHRpb25zLm1haW50YWluQXNwZWN0UmF0aW8gJiYgY2hhcnQuYXNwZWN0UmF0aW8pIHx8IG51bGw7XHJcblxyXG5cdFx0XHQvLyB0aGUgY2FudmFzIHJlbmRlciB3aWR0aCBhbmQgaGVpZ2h0IHdpbGwgYmUgY2FzdGVkIHRvIGludGVnZXJzIHNvIG1ha2Ugc3VyZSB0aGF0XHJcblx0XHRcdC8vIHRoZSBjYW52YXMgZGlzcGxheSBzdHlsZSB1c2VzIHRoZSBzYW1lIGludGVnZXIgdmFsdWVzIHRvIGF2b2lkIGJsdXJyaW5nIGVmZmVjdC5cclxuXHRcdFx0dmFyIG5ld1dpZHRoID0gTWF0aC5mbG9vcihoZWxwZXJzLmdldE1heGltdW1XaWR0aChjYW52YXMpKTtcclxuXHRcdFx0dmFyIG5ld0hlaWdodCA9IE1hdGguZmxvb3IoYXNwZWN0UmF0aW8/IG5ld1dpZHRoIC8gYXNwZWN0UmF0aW8gOiBoZWxwZXJzLmdldE1heGltdW1IZWlnaHQoY2FudmFzKSk7XHJcblxyXG5cdFx0XHRpZiAoY2hhcnQud2lkdGggPT09IG5ld1dpZHRoICYmIGNoYXJ0LmhlaWdodCA9PT0gbmV3SGVpZ2h0KSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjYW52YXMud2lkdGggPSBjaGFydC53aWR0aCA9IG5ld1dpZHRoO1xyXG5cdFx0XHRjYW52YXMuaGVpZ2h0ID0gY2hhcnQuaGVpZ2h0ID0gbmV3SGVpZ2h0O1xyXG5cclxuXHRcdFx0aGVscGVycy5yZXRpbmFTY2FsZShjaGFydCk7XHJcblxyXG5cdFx0XHRjYW52YXMuc3R5bGUud2lkdGggPSBuZXdXaWR0aCArICdweCc7XHJcblx0XHRcdGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBuZXdIZWlnaHQgKyAncHgnO1xyXG5cclxuXHRcdFx0Ly8gTm90aWZ5IGFueSBwbHVnaW5zIGFib3V0IHRoZSByZXNpemVcclxuXHRcdFx0dmFyIG5ld1NpemUgPSB7d2lkdGg6IG5ld1dpZHRoLCBoZWlnaHQ6IG5ld0hlaWdodH07XHJcblx0XHRcdENoYXJ0LnBsdWdpbnMubm90aWZ5KCdyZXNpemUnLCBbbWUsIG5ld1NpemVdKTtcclxuXHJcblx0XHRcdC8vIE5vdGlmeSBvZiByZXNpemVcclxuXHRcdFx0aWYgKG1lLm9wdGlvbnMub25SZXNpemUpIHtcclxuXHRcdFx0XHRtZS5vcHRpb25zLm9uUmVzaXplKG1lLCBuZXdTaXplKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCFzaWxlbnQpIHtcclxuXHRcdFx0XHRtZS5zdG9wKCk7XHJcblx0XHRcdFx0bWUudXBkYXRlKG1lLm9wdGlvbnMucmVzcG9uc2l2ZUFuaW1hdGlvbkR1cmF0aW9uKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHJcblx0XHRlbnN1cmVTY2FsZXNIYXZlSURzOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XHJcblx0XHRcdHZhciBzY2FsZXNPcHRpb25zID0gb3B0aW9ucy5zY2FsZXMgfHwge307XHJcblx0XHRcdHZhciBzY2FsZU9wdGlvbnMgPSBvcHRpb25zLnNjYWxlO1xyXG5cclxuXHRcdFx0aGVscGVycy5lYWNoKHNjYWxlc09wdGlvbnMueEF4ZXMsIGZ1bmN0aW9uKHhBeGlzT3B0aW9ucywgaW5kZXgpIHtcclxuXHRcdFx0XHR4QXhpc09wdGlvbnMuaWQgPSB4QXhpc09wdGlvbnMuaWQgfHwgKCd4LWF4aXMtJyArIGluZGV4KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRoZWxwZXJzLmVhY2goc2NhbGVzT3B0aW9ucy55QXhlcywgZnVuY3Rpb24oeUF4aXNPcHRpb25zLCBpbmRleCkge1xyXG5cdFx0XHRcdHlBeGlzT3B0aW9ucy5pZCA9IHlBeGlzT3B0aW9ucy5pZCB8fCAoJ3ktYXhpcy0nICsgaW5kZXgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGlmIChzY2FsZU9wdGlvbnMpIHtcclxuXHRcdFx0XHRzY2FsZU9wdGlvbnMuaWQgPSBzY2FsZU9wdGlvbnMuaWQgfHwgJ3NjYWxlJztcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEJ1aWxkcyBhIG1hcCBvZiBzY2FsZSBJRCB0byBzY2FsZSBvYmplY3QgZm9yIGZ1dHVyZSBsb29rdXAuXHJcblx0XHQgKi9cclxuXHRcdGJ1aWxkU2NhbGVzOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0dmFyIG9wdGlvbnMgPSBtZS5vcHRpb25zO1xyXG5cdFx0XHR2YXIgc2NhbGVzID0gbWUuc2NhbGVzID0ge307XHJcblx0XHRcdHZhciBpdGVtcyA9IFtdO1xyXG5cclxuXHRcdFx0aWYgKG9wdGlvbnMuc2NhbGVzKSB7XHJcblx0XHRcdFx0aXRlbXMgPSBpdGVtcy5jb25jYXQoXHJcblx0XHRcdFx0XHQob3B0aW9ucy5zY2FsZXMueEF4ZXMgfHwgW10pLm1hcChmdW5jdGlvbih4QXhpc09wdGlvbnMpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHtvcHRpb25zOiB4QXhpc09wdGlvbnMsIGR0eXBlOiAnY2F0ZWdvcnknfTtcclxuXHRcdFx0XHRcdH0pLFxyXG5cdFx0XHRcdFx0KG9wdGlvbnMuc2NhbGVzLnlBeGVzIHx8IFtdKS5tYXAoZnVuY3Rpb24oeUF4aXNPcHRpb25zKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB7b3B0aW9uczogeUF4aXNPcHRpb25zLCBkdHlwZTogJ2xpbmVhcid9O1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAob3B0aW9ucy5zY2FsZSkge1xyXG5cdFx0XHRcdGl0ZW1zLnB1c2goe29wdGlvbnM6IG9wdGlvbnMuc2NhbGUsIGR0eXBlOiAncmFkaWFsTGluZWFyJywgaXNEZWZhdWx0OiB0cnVlfSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGhlbHBlcnMuZWFjaChpdGVtcywgZnVuY3Rpb24oaXRlbSkge1xyXG5cdFx0XHRcdHZhciBzY2FsZU9wdGlvbnMgPSBpdGVtLm9wdGlvbnM7XHJcblx0XHRcdFx0dmFyIHNjYWxlVHlwZSA9IGhlbHBlcnMuZ2V0VmFsdWVPckRlZmF1bHQoc2NhbGVPcHRpb25zLnR5cGUsIGl0ZW0uZHR5cGUpO1xyXG5cdFx0XHRcdHZhciBzY2FsZUNsYXNzID0gQ2hhcnQuc2NhbGVTZXJ2aWNlLmdldFNjYWxlQ29uc3RydWN0b3Ioc2NhbGVUeXBlKTtcclxuXHRcdFx0XHRpZiAoIXNjYWxlQ2xhc3MpIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHZhciBzY2FsZSA9IG5ldyBzY2FsZUNsYXNzKHtcclxuXHRcdFx0XHRcdGlkOiBzY2FsZU9wdGlvbnMuaWQsXHJcblx0XHRcdFx0XHRvcHRpb25zOiBzY2FsZU9wdGlvbnMsXHJcblx0XHRcdFx0XHRjdHg6IG1lLmNoYXJ0LmN0eCxcclxuXHRcdFx0XHRcdGNoYXJ0OiBtZVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRzY2FsZXNbc2NhbGUuaWRdID0gc2NhbGU7XHJcblxyXG5cdFx0XHRcdC8vIFRPRE8oU0IpOiBJIHRoaW5rIHdlIHNob3VsZCBiZSBhYmxlIHRvIHJlbW92ZSB0aGlzIGN1c3RvbSBjYXNlIChvcHRpb25zLnNjYWxlKVxyXG5cdFx0XHRcdC8vIGFuZCBjb25zaWRlciBpdCBhcyBhIHJlZ3VsYXIgc2NhbGUgcGFydCBvZiB0aGUgXCJzY2FsZXNcIlwiIG1hcCBvbmx5ISBUaGlzIHdvdWxkXHJcblx0XHRcdFx0Ly8gbWFrZSB0aGUgbG9naWMgZWFzaWVyIGFuZCByZW1vdmUgc29tZSB1c2VsZXNzPyBjdXN0b20gY29kZS5cclxuXHRcdFx0XHRpZiAoaXRlbS5pc0RlZmF1bHQpIHtcclxuXHRcdFx0XHRcdG1lLnNjYWxlID0gc2NhbGU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdENoYXJ0LnNjYWxlU2VydmljZS5hZGRTY2FsZXNUb0xheW91dCh0aGlzKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0dXBkYXRlTGF5b3V0OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0Q2hhcnQubGF5b3V0U2VydmljZS51cGRhdGUodGhpcywgdGhpcy5jaGFydC53aWR0aCwgdGhpcy5jaGFydC5oZWlnaHQpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRidWlsZE9yVXBkYXRlQ29udHJvbGxlcnM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgdHlwZXMgPSBbXTtcclxuXHRcdFx0dmFyIG5ld0NvbnRyb2xsZXJzID0gW107XHJcblxyXG5cdFx0XHRoZWxwZXJzLmVhY2gobWUuZGF0YS5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCwgZGF0YXNldEluZGV4KSB7XHJcblx0XHRcdFx0dmFyIG1ldGEgPSBtZS5nZXREYXRhc2V0TWV0YShkYXRhc2V0SW5kZXgpO1xyXG5cdFx0XHRcdGlmICghbWV0YS50eXBlKSB7XHJcblx0XHRcdFx0XHRtZXRhLnR5cGUgPSBkYXRhc2V0LnR5cGUgfHwgbWUuY29uZmlnLnR5cGU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0eXBlcy5wdXNoKG1ldGEudHlwZSk7XHJcblxyXG5cdFx0XHRcdGlmIChtZXRhLmNvbnRyb2xsZXIpIHtcclxuXHRcdFx0XHRcdG1ldGEuY29udHJvbGxlci51cGRhdGVJbmRleChkYXRhc2V0SW5kZXgpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRtZXRhLmNvbnRyb2xsZXIgPSBuZXcgQ2hhcnQuY29udHJvbGxlcnNbbWV0YS50eXBlXShtZSwgZGF0YXNldEluZGV4KTtcclxuXHRcdFx0XHRcdG5ld0NvbnRyb2xsZXJzLnB1c2gobWV0YS5jb250cm9sbGVyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sIG1lKTtcclxuXHJcblx0XHRcdGlmICh0eXBlcy5sZW5ndGggPiAxKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCB0eXBlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKHR5cGVzW2ldICE9PSB0eXBlc1tpIC0gMV0pIHtcclxuXHRcdFx0XHRcdFx0bWUuaXNDb21ibyA9IHRydWU7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG5ld0NvbnRyb2xsZXJzO1xyXG5cdFx0fSxcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFJlc2V0IHRoZSBlbGVtZW50cyBvZiBhbGwgZGF0YXNldHNcclxuXHRcdCAqIEBtZXRob2QgcmVzZXRFbGVtZW50c1xyXG5cdFx0ICogQHByaXZhdGVcclxuXHRcdCAqL1xyXG5cdFx0cmVzZXRFbGVtZW50czogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdGhlbHBlcnMuZWFjaChtZS5kYXRhLmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0LCBkYXRhc2V0SW5kZXgpIHtcclxuXHRcdFx0XHRtZS5nZXREYXRhc2V0TWV0YShkYXRhc2V0SW5kZXgpLmNvbnRyb2xsZXIucmVzZXQoKTtcclxuXHRcdFx0fSwgbWUpO1xyXG5cdFx0fSxcclxuXHJcblx0XHQvKipcclxuXHRcdCogUmVzZXRzIHRoZSBjaGFydCBiYWNrIHRvIGl0J3Mgc3RhdGUgYmVmb3JlIHRoZSBpbml0aWFsIGFuaW1hdGlvblxyXG5cdFx0KiBAbWV0aG9kIHJlc2V0XHJcblx0XHQqL1xyXG5cdFx0cmVzZXQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLnJlc2V0RWxlbWVudHMoKTtcclxuXHRcdFx0dGhpcy50b29sdGlwLmluaXRpYWxpemUoKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0dXBkYXRlOiBmdW5jdGlvbihhbmltYXRpb25EdXJhdGlvbiwgbGF6eSkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHRDaGFydC5wbHVnaW5zLm5vdGlmeSgnYmVmb3JlVXBkYXRlJywgW21lXSk7XHJcblxyXG5cdFx0XHQvLyBJbiBjYXNlIHRoZSBlbnRpcmUgZGF0YSBvYmplY3QgY2hhbmdlZFxyXG5cdFx0XHRtZS50b29sdGlwLl9kYXRhID0gbWUuZGF0YTtcclxuXHJcblx0XHRcdC8vIE1ha2Ugc3VyZSBkYXRhc2V0IGNvbnRyb2xsZXJzIGFyZSB1cGRhdGVkIGFuZCBuZXcgY29udHJvbGxlcnMgYXJlIHJlc2V0XHJcblx0XHRcdHZhciBuZXdDb250cm9sbGVycyA9IG1lLmJ1aWxkT3JVcGRhdGVDb250cm9sbGVycygpO1xyXG5cclxuXHRcdFx0Ly8gTWFrZSBzdXJlIGFsbCBkYXRhc2V0IGNvbnRyb2xsZXJzIGhhdmUgY29ycmVjdCBtZXRhIGRhdGEgY291bnRzXHJcblx0XHRcdGhlbHBlcnMuZWFjaChtZS5kYXRhLmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0LCBkYXRhc2V0SW5kZXgpIHtcclxuXHRcdFx0XHRtZS5nZXREYXRhc2V0TWV0YShkYXRhc2V0SW5kZXgpLmNvbnRyb2xsZXIuYnVpbGRPclVwZGF0ZUVsZW1lbnRzKCk7XHJcblx0XHRcdH0sIG1lKTtcclxuXHJcblx0XHRcdENoYXJ0LmxheW91dFNlcnZpY2UudXBkYXRlKG1lLCBtZS5jaGFydC53aWR0aCwgbWUuY2hhcnQuaGVpZ2h0KTtcclxuXHJcblx0XHRcdC8vIEFwcGx5IGNoYW5nZXMgdG8gdGhlIGRhdGFzZXRzIHRoYXQgcmVxdWlyZSB0aGUgc2NhbGVzIHRvIGhhdmUgYmVlbiBjYWxjdWxhdGVkIGkuZSBCb3JkZXJDb2xvciBjaGFuZ2VzXHJcblx0XHRcdENoYXJ0LnBsdWdpbnMubm90aWZ5KCdhZnRlclNjYWxlVXBkYXRlJywgW21lXSk7XHJcblxyXG5cdFx0XHQvLyBDYW4gb25seSByZXNldCB0aGUgbmV3IGNvbnRyb2xsZXJzIGFmdGVyIHRoZSBzY2FsZXMgaGF2ZSBiZWVuIHVwZGF0ZWRcclxuXHRcdFx0aGVscGVycy5lYWNoKG5ld0NvbnRyb2xsZXJzLCBmdW5jdGlvbihjb250cm9sbGVyKSB7XHJcblx0XHRcdFx0Y29udHJvbGxlci5yZXNldCgpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdG1lLnVwZGF0ZURhdGFzZXRzKCk7XHJcblxyXG5cdFx0XHQvLyBEbyB0aGlzIGJlZm9yZSByZW5kZXIgc28gdGhhdCBhbnkgcGx1Z2lucyB0aGF0IG5lZWQgZmluYWwgc2NhbGUgdXBkYXRlcyBjYW4gdXNlIGl0XHJcblx0XHRcdENoYXJ0LnBsdWdpbnMubm90aWZ5KCdhZnRlclVwZGF0ZScsIFttZV0pO1xyXG5cclxuXHRcdFx0aWYgKG1lLl9idWZmZXJlZFJlbmRlcikge1xyXG5cdFx0XHRcdG1lLl9idWZmZXJlZFJlcXVlc3QgPSB7XHJcblx0XHRcdFx0XHRsYXp5OiBsYXp5LFxyXG5cdFx0XHRcdFx0ZHVyYXRpb246IGFuaW1hdGlvbkR1cmF0aW9uXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRtZS5yZW5kZXIoYW5pbWF0aW9uRHVyYXRpb24sIGxhenkpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogQG1ldGhvZCBiZWZvcmVEYXRhc2V0c1VwZGF0ZVxyXG5cdFx0ICogQGRlc2NyaXB0aW9uIENhbGxlZCBiZWZvcmUgYWxsIGRhdGFzZXRzIGFyZSB1cGRhdGVkLiBJZiBhIHBsdWdpbiByZXR1cm5zIGZhbHNlLFxyXG5cdFx0ICogdGhlIGRhdGFzZXRzIHVwZGF0ZSB3aWxsIGJlIGNhbmNlbGxlZCB1bnRpbCBhbm90aGVyIGNoYXJ0IHVwZGF0ZSBpcyB0cmlnZ2VyZWQuXHJcblx0XHQgKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2UgdGhlIGNoYXJ0IGluc3RhbmNlIGJlaW5nIHVwZGF0ZWQuXHJcblx0XHQgKiBAcmV0dXJucyB7Qm9vbGVhbn0gZmFsc2UgdG8gY2FuY2VsIHRoZSBkYXRhc2V0cyB1cGRhdGUuXHJcblx0XHQgKiBAbWVtYmVyb2YgQ2hhcnQuUGx1Z2luQmFzZVxyXG5cdFx0ICogQHNpbmNlIHZlcnNpb24gMi4xLjVcclxuXHRcdCAqIEBpbnN0YW5jZVxyXG5cdFx0ICovXHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBAbWV0aG9kIGFmdGVyRGF0YXNldHNVcGRhdGVcclxuXHRcdCAqIEBkZXNjcmlwdGlvbiBDYWxsZWQgYWZ0ZXIgYWxsIGRhdGFzZXRzIGhhdmUgYmVlbiB1cGRhdGVkLiBOb3RlIHRoYXQgdGhpc1xyXG5cdFx0ICogZXh0ZW5zaW9uIHdpbGwgbm90IGJlIGNhbGxlZCBpZiB0aGUgZGF0YXNldHMgdXBkYXRlIGhhcyBiZWVuIGNhbmNlbGxlZC5cclxuXHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBpbnN0YW5jZSB0aGUgY2hhcnQgaW5zdGFuY2UgYmVpbmcgdXBkYXRlZC5cclxuXHRcdCAqIEBtZW1iZXJvZiBDaGFydC5QbHVnaW5CYXNlXHJcblx0XHQgKiBAc2luY2UgdmVyc2lvbiAyLjEuNVxyXG5cdFx0ICogQGluc3RhbmNlXHJcblx0XHQgKi9cclxuXHJcblx0XHQvKipcclxuXHRcdCAqIFVwZGF0ZXMgYWxsIGRhdGFzZXRzIHVubGVzcyBhIHBsdWdpbiByZXR1cm5zIGZhbHNlIHRvIHRoZSBiZWZvcmVEYXRhc2V0c1VwZGF0ZVxyXG5cdFx0ICogZXh0ZW5zaW9uLCBpbiB3aGljaCBjYXNlIG5vIGRhdGFzZXRzIHdpbGwgYmUgdXBkYXRlZCBhbmQgdGhlIGFmdGVyRGF0YXNldHNVcGRhdGVcclxuXHRcdCAqIG5vdGlmaWNhdGlvbiB3aWxsIGJlIHNraXBwZWQuXHJcblx0XHQgKiBAcHJvdGVjdGVkXHJcblx0XHQgKiBAaW5zdGFuY2VcclxuXHRcdCAqL1xyXG5cdFx0dXBkYXRlRGF0YXNldHM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgaSwgaWxlbjtcclxuXHJcblx0XHRcdGlmIChDaGFydC5wbHVnaW5zLm5vdGlmeSgnYmVmb3JlRGF0YXNldHNVcGRhdGUnLCBbbWVdKSkge1xyXG5cdFx0XHRcdGZvciAoaSA9IDAsIGlsZW4gPSBtZS5kYXRhLmRhdGFzZXRzLmxlbmd0aDsgaSA8IGlsZW47ICsraSkge1xyXG5cdFx0XHRcdFx0bWUuZ2V0RGF0YXNldE1ldGEoaSkuY29udHJvbGxlci51cGRhdGUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdENoYXJ0LnBsdWdpbnMubm90aWZ5KCdhZnRlckRhdGFzZXRzVXBkYXRlJywgW21lXSk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblxyXG5cdFx0cmVuZGVyOiBmdW5jdGlvbihkdXJhdGlvbiwgbGF6eSkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHRDaGFydC5wbHVnaW5zLm5vdGlmeSgnYmVmb3JlUmVuZGVyJywgW21lXSk7XHJcblxyXG5cdFx0XHR2YXIgYW5pbWF0aW9uT3B0aW9ucyA9IG1lLm9wdGlvbnMuYW5pbWF0aW9uO1xyXG5cdFx0XHRpZiAoYW5pbWF0aW9uT3B0aW9ucyAmJiAoKHR5cGVvZiBkdXJhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgZHVyYXRpb24gIT09IDApIHx8ICh0eXBlb2YgZHVyYXRpb24gPT09ICd1bmRlZmluZWQnICYmIGFuaW1hdGlvbk9wdGlvbnMuZHVyYXRpb24gIT09IDApKSkge1xyXG5cdFx0XHRcdHZhciBhbmltYXRpb24gPSBuZXcgQ2hhcnQuQW5pbWF0aW9uKCk7XHJcblx0XHRcdFx0YW5pbWF0aW9uLm51bVN0ZXBzID0gKGR1cmF0aW9uIHx8IGFuaW1hdGlvbk9wdGlvbnMuZHVyYXRpb24pIC8gMTYuNjY7IC8vIDYwIGZwc1xyXG5cdFx0XHRcdGFuaW1hdGlvbi5lYXNpbmcgPSBhbmltYXRpb25PcHRpb25zLmVhc2luZztcclxuXHJcblx0XHRcdFx0Ly8gcmVuZGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0YW5pbWF0aW9uLnJlbmRlciA9IGZ1bmN0aW9uKGNoYXJ0SW5zdGFuY2UsIGFuaW1hdGlvbk9iamVjdCkge1xyXG5cdFx0XHRcdFx0dmFyIGVhc2luZ0Z1bmN0aW9uID0gaGVscGVycy5lYXNpbmdFZmZlY3RzW2FuaW1hdGlvbk9iamVjdC5lYXNpbmddO1xyXG5cdFx0XHRcdFx0dmFyIHN0ZXBEZWNpbWFsID0gYW5pbWF0aW9uT2JqZWN0LmN1cnJlbnRTdGVwIC8gYW5pbWF0aW9uT2JqZWN0Lm51bVN0ZXBzO1xyXG5cdFx0XHRcdFx0dmFyIGVhc2VEZWNpbWFsID0gZWFzaW5nRnVuY3Rpb24oc3RlcERlY2ltYWwpO1xyXG5cclxuXHRcdFx0XHRcdGNoYXJ0SW5zdGFuY2UuZHJhdyhlYXNlRGVjaW1hbCwgc3RlcERlY2ltYWwsIGFuaW1hdGlvbk9iamVjdC5jdXJyZW50U3RlcCk7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Ly8gdXNlciBldmVudHNcclxuXHRcdFx0XHRhbmltYXRpb24ub25BbmltYXRpb25Qcm9ncmVzcyA9IGFuaW1hdGlvbk9wdGlvbnMub25Qcm9ncmVzcztcclxuXHRcdFx0XHRhbmltYXRpb24ub25BbmltYXRpb25Db21wbGV0ZSA9IGFuaW1hdGlvbk9wdGlvbnMub25Db21wbGV0ZTtcclxuXHJcblx0XHRcdFx0Q2hhcnQuYW5pbWF0aW9uU2VydmljZS5hZGRBbmltYXRpb24obWUsIGFuaW1hdGlvbiwgZHVyYXRpb24sIGxhenkpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdG1lLmRyYXcoKTtcclxuXHRcdFx0XHRpZiAoYW5pbWF0aW9uT3B0aW9ucyAmJiBhbmltYXRpb25PcHRpb25zLm9uQ29tcGxldGUgJiYgYW5pbWF0aW9uT3B0aW9ucy5vbkNvbXBsZXRlLmNhbGwpIHtcclxuXHRcdFx0XHRcdGFuaW1hdGlvbk9wdGlvbnMub25Db21wbGV0ZS5jYWxsKG1lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIG1lO1xyXG5cdFx0fSxcclxuXHJcblx0XHRkcmF3OiBmdW5jdGlvbihlYXNlKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBlYXNpbmdEZWNpbWFsID0gZWFzZSB8fCAxO1xyXG5cdFx0XHRtZS5jbGVhcigpO1xyXG5cclxuXHRcdFx0Q2hhcnQucGx1Z2lucy5ub3RpZnkoJ2JlZm9yZURyYXcnLCBbbWUsIGVhc2luZ0RlY2ltYWxdKTtcclxuXHJcblx0XHRcdC8vIERyYXcgYWxsIHRoZSBzY2FsZXNcclxuXHRcdFx0aGVscGVycy5lYWNoKG1lLmJveGVzLCBmdW5jdGlvbihib3gpIHtcclxuXHRcdFx0XHRib3guZHJhdyhtZS5jaGFydEFyZWEsYm94KTsvL3RvZG8g5Lyg5YWlYm9455So5LqO5Yy65YiGeOi9tHnovbRcclxuXHRcdFx0fSwgbWUpO1xyXG5cdFx0XHRpZiAobWUuc2NhbGUpIHtcclxuXHRcdFx0XHRtZS5zY2FsZS5kcmF3KCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdENoYXJ0LnBsdWdpbnMubm90aWZ5KCdiZWZvcmVEYXRhc2V0c0RyYXcnLCBbbWUsIGVhc2luZ0RlY2ltYWxdKTtcclxuXHJcblx0XHRcdC8vIERyYXcgZWFjaCBkYXRhc2V0IHZpYSBpdHMgcmVzcGVjdGl2ZSBjb250cm9sbGVyIChyZXZlcnNlZCB0byBzdXBwb3J0IHByb3BlciBsaW5lIHN0YWNraW5nKVxyXG5cdFx0XHRoZWxwZXJzLmVhY2gobWUuZGF0YS5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCwgZGF0YXNldEluZGV4KSB7XHJcblx0XHRcdFx0aWYgKG1lLmlzRGF0YXNldFZpc2libGUoZGF0YXNldEluZGV4KSkge1xyXG5cdFx0XHRcdFx0bWUuZ2V0RGF0YXNldE1ldGEoZGF0YXNldEluZGV4KS5jb250cm9sbGVyLmRyYXcoZWFzZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCBtZSwgdHJ1ZSk7XHJcblxyXG5cdFx0XHRDaGFydC5wbHVnaW5zLm5vdGlmeSgnYWZ0ZXJEYXRhc2V0c0RyYXcnLCBbbWUsIGVhc2luZ0RlY2ltYWxdKTtcclxuXHJcblx0XHRcdC8vIEZpbmFsbHkgZHJhdyB0aGUgdG9vbHRpcFxyXG5cdFx0XHRtZS50b29sdGlwLnRyYW5zaXRpb24oZWFzaW5nRGVjaW1hbCkuZHJhdygpO1xyXG5cclxuXHRcdFx0Q2hhcnQucGx1Z2lucy5ub3RpZnkoJ2FmdGVyRHJhdycsIFttZSwgZWFzaW5nRGVjaW1hbF0pO1xyXG5cdFx0XHRcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gR2V0IHRoZSBzaW5nbGUgZWxlbWVudCB0aGF0IHdhcyBjbGlja2VkIG9uXHJcblx0XHQvLyBAcmV0dXJuIDogQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGRhdGFzZXQgaW5kZXggYW5kIGVsZW1lbnQgaW5kZXggb2YgdGhlIG1hdGNoaW5nIGVsZW1lbnQuIEFsc28gY29udGFpbnMgdGhlIHJlY3RhbmdsZSB0aGF0IHdhcyBkcmF3XHJcblx0XHRnZXRFbGVtZW50QXRFdmVudDogZnVuY3Rpb24oZSkge1xyXG5cdFx0XHRyZXR1cm4gQ2hhcnQuSW50ZXJhY3Rpb24ubW9kZXMuc2luZ2xlKHRoaXMsIGUpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRnZXRFbGVtZW50c0F0RXZlbnQ6IGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0cmV0dXJuIENoYXJ0LkludGVyYWN0aW9uLm1vZGVzLmxhYmVsKHRoaXMsIGUsIHtpbnRlcnNlY3Q6IHRydWV9KTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Z2V0RWxlbWVudHNBdFhBeGlzOiBmdW5jdGlvbihlKSB7XHJcblx0XHRcdHJldHVybiBDaGFydC5JbnRlcmFjdGlvbi5tb2Rlc1sneC1heGlzJ10odGhpcywgZSwge2ludGVyc2VjdDogdHJ1ZX0pO1xyXG5cdFx0fSxcclxuXHJcblx0XHRnZXRFbGVtZW50c0F0RXZlbnRGb3JNb2RlOiBmdW5jdGlvbihlLCBtb2RlLCBvcHRpb25zKSB7XHJcblx0XHRcdHZhciBtZXRob2QgPSBDaGFydC5JbnRlcmFjdGlvbi5tb2Rlc1ttb2RlXTtcclxuXHRcdFx0aWYgKHR5cGVvZiBtZXRob2QgPT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0XHRyZXR1cm4gbWV0aG9kKHRoaXMsIGUsIG9wdGlvbnMpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gW107XHJcblx0XHR9LFxyXG5cclxuXHRcdGdldERhdGFzZXRBdEV2ZW50OiBmdW5jdGlvbihlKSB7XHJcblx0XHRcdHJldHVybiBDaGFydC5JbnRlcmFjdGlvbi5tb2Rlcy5kYXRhc2V0KHRoaXMsIGUpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRnZXREYXRhc2V0TWV0YTogZnVuY3Rpb24oZGF0YXNldEluZGV4KSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBkYXRhc2V0ID0gbWUuZGF0YS5kYXRhc2V0c1tkYXRhc2V0SW5kZXhdO1xyXG5cdFx0XHRpZiAoIWRhdGFzZXQuX21ldGEpIHtcclxuXHRcdFx0XHRkYXRhc2V0Ll9tZXRhID0ge307XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBtZXRhID0gZGF0YXNldC5fbWV0YVttZS5pZF07XHJcblx0XHRcdGlmICghbWV0YSkge1xyXG5cdFx0XHRcdG1ldGEgPSBkYXRhc2V0Ll9tZXRhW21lLmlkXSA9IHtcclxuXHRcdFx0XHRcdHR5cGU6IG51bGwsXHJcblx0XHRcdFx0XHRkYXRhOiBbXSxcclxuXHRcdFx0XHRcdGRhdGFzZXQ6IG51bGwsXHJcblx0XHRcdFx0XHRjb250cm9sbGVyOiBudWxsLFxyXG5cdFx0XHRcdFx0aGlkZGVuOiBudWxsLFx0XHRcdC8vIFNlZSBpc0RhdGFzZXRWaXNpYmxlKCkgY29tbWVudFxyXG5cdFx0XHRcdFx0eEF4aXNJRDogbnVsbCxcclxuXHRcdFx0XHRcdHlBeGlzSUQ6IG51bGxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gbWV0YTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Z2V0VmlzaWJsZURhdGFzZXRDb3VudDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBjb3VudCA9IDA7XHJcblx0XHRcdGZvciAodmFyIGkgPSAwLCBpbGVuID0gdGhpcy5kYXRhLmRhdGFzZXRzLmxlbmd0aDsgaTxpbGVuOyArK2kpIHtcclxuXHRcdFx0XHRpZiAodGhpcy5pc0RhdGFzZXRWaXNpYmxlKGkpKSB7XHJcblx0XHRcdFx0XHRjb3VudCsrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gY291bnQ7XHJcblx0XHR9LFxyXG5cclxuXHRcdGlzRGF0YXNldFZpc2libGU6IGZ1bmN0aW9uKGRhdGFzZXRJbmRleCkge1xyXG5cdFx0XHR2YXIgbWV0YSA9IHRoaXMuZ2V0RGF0YXNldE1ldGEoZGF0YXNldEluZGV4KTtcclxuXHJcblx0XHRcdC8vIG1ldGEuaGlkZGVuIGlzIGEgcGVyIGNoYXJ0IGRhdGFzZXQgaGlkZGVuIGZsYWcgb3ZlcnJpZGUgd2l0aCAzIHN0YXRlczogaWYgdHJ1ZSBvciBmYWxzZSxcclxuXHRcdFx0Ly8gdGhlIGRhdGFzZXQuaGlkZGVuIHZhbHVlIGlzIGlnbm9yZWQsIGVsc2UgaWYgbnVsbCwgdGhlIGRhdGFzZXQgaGlkZGVuIHN0YXRlIGlzIHJldHVybmVkLlxyXG5cdFx0XHRyZXR1cm4gdHlwZW9mIG1ldGEuaGlkZGVuID09PSAnYm9vbGVhbic/ICFtZXRhLmhpZGRlbiA6ICF0aGlzLmRhdGEuZGF0YXNldHNbZGF0YXNldEluZGV4XS5oaWRkZW47XHJcblx0XHR9LFxyXG5cclxuXHRcdGdlbmVyYXRlTGVnZW5kOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMub3B0aW9ucy5sZWdlbmRDYWxsYmFjayh0aGlzKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0ZGVzdHJveTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBjYW52YXMgPSBtZS5jaGFydC5jYW52YXM7XHJcblx0XHRcdHZhciBtZXRhLCBpLCBpbGVuO1xyXG5cclxuXHRcdFx0bWUuc3RvcCgpO1xyXG5cclxuXHRcdFx0Ly8gZGF0YXNldCBjb250cm9sbGVycyBuZWVkIHRvIGNsZWFudXAgYXNzb2NpYXRlZCBkYXRhXHJcblx0XHRcdGZvciAoaSA9IDAsIGlsZW4gPSBtZS5kYXRhLmRhdGFzZXRzLmxlbmd0aDsgaSA8IGlsZW47ICsraSkge1xyXG5cdFx0XHRcdG1ldGEgPSBtZS5nZXREYXRhc2V0TWV0YShpKTtcclxuXHRcdFx0XHRpZiAobWV0YS5jb250cm9sbGVyKSB7XHJcblx0XHRcdFx0XHRtZXRhLmNvbnRyb2xsZXIuZGVzdHJveSgpO1xyXG5cdFx0XHRcdFx0bWV0YS5jb250cm9sbGVyID0gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChjYW52YXMpIHtcclxuXHRcdFx0XHRoZWxwZXJzLnVuYmluZEV2ZW50cyhtZSwgbWUuZXZlbnRzKTtcclxuXHRcdFx0XHRoZWxwZXJzLnJlbW92ZVJlc2l6ZUxpc3RlbmVyKGNhbnZhcy5wYXJlbnROb2RlKTtcclxuXHRcdFx0XHRoZWxwZXJzLmNsZWFyKG1lLmNoYXJ0KTtcclxuXHRcdFx0XHRyZWxlYXNlQ2FudmFzKGNhbnZhcyk7XHJcblx0XHRcdFx0bWUuY2hhcnQuY2FudmFzID0gbnVsbDtcclxuXHRcdFx0XHRtZS5jaGFydC5jdHggPSBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBpZiB3ZSBzY2FsZWQgdGhlIGNhbnZhcyBpbiByZXNwb25zZSB0byBhIGRldmljZVBpeGVsUmF0aW8gIT09IDEsIHdlIG5lZWQgdG8gdW5kbyB0aGF0IHRyYW5zZm9ybSBoZXJlXHJcblx0XHRcdGlmIChtZS5jaGFydC5vcmlnaW5hbERldmljZVBpeGVsUmF0aW8gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdG1lLmNoYXJ0LmN0eC5zY2FsZSgxIC8gbWUuY2hhcnQub3JpZ2luYWxEZXZpY2VQaXhlbFJhdGlvLCAxIC8gbWUuY2hhcnQub3JpZ2luYWxEZXZpY2VQaXhlbFJhdGlvKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Q2hhcnQucGx1Z2lucy5ub3RpZnkoJ2Rlc3Ryb3knLCBbbWVdKTtcclxuXHJcblx0XHRcdGRlbGV0ZSBDaGFydC5pbnN0YW5jZXNbbWUuaWRdO1xyXG5cdFx0fSxcclxuXHJcblx0XHR0b0Jhc2U2NEltYWdlOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuY2hhcnQuY2FudmFzLnRvRGF0YVVSTC5hcHBseSh0aGlzLmNoYXJ0LmNhbnZhcywgYXJndW1lbnRzKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0aW5pdFRvb2xUaXA6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHRtZS50b29sdGlwID0gbmV3IENoYXJ0LlRvb2x0aXAoe1xyXG5cdFx0XHRcdF9jaGFydDogbWUuY2hhcnQsXHJcblx0XHRcdFx0X2NoYXJ0SW5zdGFuY2U6IG1lLFxyXG5cdFx0XHRcdF9kYXRhOiBtZS5kYXRhLFxyXG5cdFx0XHRcdF9vcHRpb25zOiBtZS5vcHRpb25zLnRvb2x0aXBzXHJcblx0XHRcdH0sIG1lKTtcclxuXHRcdFx0bWUudG9vbHRpcC5pbml0aWFsaXplKCk7XHJcblx0XHR9LFxyXG5cclxuXHRcdGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHRoZWxwZXJzLmJpbmRFdmVudHMobWUsIG1lLm9wdGlvbnMuZXZlbnRzLCBmdW5jdGlvbihldnQpIHtcclxuXHRcdFx0XHRtZS5ldmVudEhhbmRsZXIoZXZ0KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdHVwZGF0ZUhvdmVyU3R5bGU6IGZ1bmN0aW9uKGVsZW1lbnRzLCBtb2RlLCBlbmFibGVkKSB7XHJcblx0XHRcdHZhciBtZXRob2QgPSBlbmFibGVkPyAnc2V0SG92ZXJTdHlsZScgOiAncmVtb3ZlSG92ZXJTdHlsZSc7XHJcblx0XHRcdHZhciBlbGVtZW50LCBpLCBpbGVuO1xyXG5cclxuXHRcdFx0Zm9yIChpPTAsIGlsZW49ZWxlbWVudHMubGVuZ3RoOyBpPGlsZW47ICsraSkge1xyXG5cdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcclxuXHRcdFx0XHRpZiAoZWxlbWVudCkge1xyXG5cdFx0XHRcdFx0dGhpcy5nZXREYXRhc2V0TWV0YShlbGVtZW50Ll9kYXRhc2V0SW5kZXgpLmNvbnRyb2xsZXJbbWV0aG9kXShlbGVtZW50KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblxyXG5cdFx0ZXZlbnRIYW5kbGVyOiBmdW5jdGlvbihlKSB7XHJcblx0XHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRcdHZhciBob3Zlck9wdGlvbnMgPSBtZS5vcHRpb25zLmhvdmVyO1xyXG5cclxuXHRcdFx0Ly8gQnVmZmVyIGFueSB1cGRhdGUgY2FsbHMgc28gdGhhdCByZW5kZXJzIGRvIG5vdCBvY2N1clxyXG5cdFx0XHRtZS5fYnVmZmVyZWRSZW5kZXIgPSB0cnVlO1xyXG5cdFx0XHRtZS5fYnVmZmVyZWRSZXF1ZXN0ID0gbnVsbDtcclxuXHJcblx0XHRcdHZhciBjaGFuZ2VkID0gbWUuaGFuZGxlRXZlbnQoZSk7XHJcblx0XHRcdGNoYW5nZWQgfD0gbWUubGVnZW5kLmhhbmRsZUV2ZW50KGUpO1xyXG5cdFx0XHRjaGFuZ2VkIHw9IG1lLnRvb2x0aXAuaGFuZGxlRXZlbnQoZSk7XHJcblxyXG5cdFx0XHR2YXIgYnVmZmVyZWRSZXF1ZXN0ID0gbWUuX2J1ZmZlcmVkUmVxdWVzdDtcclxuXHRcdFx0aWYgKGJ1ZmZlcmVkUmVxdWVzdCkge1xyXG5cdFx0XHRcdC8vIElmIHdlIGhhdmUgYW4gdXBkYXRlIHRoYXQgd2FzIHRyaWdnZXJlZCwgd2UgbmVlZCB0byBkbyBhIG5vcm1hbCByZW5kZXJcclxuXHRcdFx0XHRtZS5yZW5kZXIoYnVmZmVyZWRSZXF1ZXN0LmR1cmF0aW9uLCBidWZmZXJlZFJlcXVlc3QubGF6eSk7XHJcblx0XHRcdH0gZWxzZSBpZiAoY2hhbmdlZCAmJiAhbWUuYW5pbWF0aW5nKSB7XHJcblx0XHRcdFx0Ly8gSWYgZW50ZXJpbmcsIGxlYXZpbmcsIG9yIGNoYW5naW5nIGVsZW1lbnRzLCBhbmltYXRlIHRoZSBjaGFuZ2UgdmlhIHBpdm90XHJcblx0XHRcdFx0bWUuc3RvcCgpO1xyXG5cclxuXHRcdFx0XHQvLyBXZSBvbmx5IG5lZWQgdG8gcmVuZGVyIGF0IHRoaXMgcG9pbnQuIFVwZGF0aW5nIHdpbGwgY2F1c2Ugc2NhbGVzIHRvIGJlXHJcblx0XHRcdFx0Ly8gcmVjb21wdXRlZCBnZW5lcmF0aW5nIGZsaWNrZXIgJiB1c2luZyBtb3JlIG1lbW9yeSB0aGFuIG5lY2Vzc2FyeS5cclxuXHRcdFx0XHRtZS5yZW5kZXIoaG92ZXJPcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uLCB0cnVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0bWUuX2J1ZmZlcmVkUmVuZGVyID0gZmFsc2U7XHJcblx0XHRcdG1lLl9idWZmZXJlZFJlcXVlc3QgPSBudWxsO1xyXG5cclxuXHRcdFx0cmV0dXJuIG1lO1xyXG5cdFx0fSxcclxuXHJcblx0XHQvKipcclxuXHRcdCAqIEhhbmRsZSBhbiBldmVudFxyXG5cdFx0ICogQHByaXZhdGVcclxuXHRcdCAqIHBhcmFtIGUge0V2ZW50fSB0aGUgZXZlbnQgdG8gaGFuZGxlXHJcblx0XHQgKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlIGlmIHRoZSBjaGFydCBuZWVkcyB0byByZS1yZW5kZXJcclxuXHRcdCAqL1xyXG5cdFx0aGFuZGxlRXZlbnQ6IGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFx0dmFyIG9wdGlvbnMgPSBtZS5vcHRpb25zIHx8IHt9O1xyXG5cdFx0XHR2YXIgaG92ZXJPcHRpb25zID0gb3B0aW9ucy5ob3ZlcjtcclxuXHRcdFx0dmFyIGNoYW5nZWQgPSBmYWxzZTtcclxuXHJcblx0XHRcdG1lLmxhc3RBY3RpdmUgPSBtZS5sYXN0QWN0aXZlIHx8IFtdO1xyXG5cclxuXHRcdFx0Ly8gRmluZCBBY3RpdmUgRWxlbWVudHMgZm9yIGhvdmVyIGFuZCB0b29sdGlwc1xyXG5cdFx0XHRpZiAoZS50eXBlID09PSAnbW91c2VvdXQnKSB7XHJcblx0XHRcdFx0bWUuYWN0aXZlID0gW107XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bWUuYWN0aXZlID0gbWUuZ2V0RWxlbWVudHNBdEV2ZW50Rm9yTW9kZShlLCBob3Zlck9wdGlvbnMubW9kZSwgaG92ZXJPcHRpb25zKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gT24gSG92ZXIgaG9va1xyXG5cdFx0XHRpZiAoaG92ZXJPcHRpb25zLm9uSG92ZXIpIHtcclxuXHRcdFx0XHRob3Zlck9wdGlvbnMub25Ib3Zlci5jYWxsKG1lLCBtZS5hY3RpdmUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoZS50eXBlID09PSAnbW91c2V1cCcgfHwgZS50eXBlID09PSAnY2xpY2snKSB7XHJcblx0XHRcdFx0aWYgKG9wdGlvbnMub25DbGljaykge1xyXG5cdFx0XHRcdFx0b3B0aW9ucy5vbkNsaWNrLmNhbGwobWUsIGUsIG1lLmFjdGl2ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZW1vdmUgc3R5bGluZyBmb3IgbGFzdCBhY3RpdmUgKGV2ZW4gaWYgaXQgbWF5IHN0aWxsIGJlIGFjdGl2ZSlcclxuXHRcdFx0aWYgKG1lLmxhc3RBY3RpdmUubGVuZ3RoKSB7XHJcblx0XHRcdFx0bWUudXBkYXRlSG92ZXJTdHlsZShtZS5sYXN0QWN0aXZlLCBob3Zlck9wdGlvbnMubW9kZSwgZmFsc2UpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBCdWlsdCBpbiBob3ZlciBzdHlsaW5nXHJcblx0XHRcdGlmIChtZS5hY3RpdmUubGVuZ3RoICYmIGhvdmVyT3B0aW9ucy5tb2RlKSB7XHJcblx0XHRcdFx0bWUudXBkYXRlSG92ZXJTdHlsZShtZS5hY3RpdmUsIGhvdmVyT3B0aW9ucy5tb2RlLCB0cnVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y2hhbmdlZCA9ICFoZWxwZXJzLmFycmF5RXF1YWxzKG1lLmFjdGl2ZSwgbWUubGFzdEFjdGl2ZSk7XHJcblxyXG5cdFx0XHQvLyBSZW1lbWJlciBMYXN0IEFjdGl2ZXNcclxuXHRcdFx0bWUubGFzdEFjdGl2ZSA9IG1lLmFjdGl2ZTtcclxuXHJcblx0XHRcdHJldHVybiBjaGFuZ2VkO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59O1xyXG4iXX0=