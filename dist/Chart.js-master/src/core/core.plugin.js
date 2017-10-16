'use strict';

module.exports = function (Chart) {

	var noop = Chart.helpers.noop;

	/**
  * The plugin service singleton
  * @namespace Chart.plugins
  * @since 2.1.0
  */
	Chart.plugins = {
		_plugins: [],

		/**
   * Registers the given plugin(s) if not already registered.
   * @param {Array|Object} plugins plugin instance(s).
   */
		register: function register(plugins) {
			var p = this._plugins;
			[].concat(plugins).forEach(function (plugin) {
				if (p.indexOf(plugin) === -1) {
					p.push(plugin);
				}
			});
		},

		/**
   * Unregisters the given plugin(s) only if registered.
   * @param {Array|Object} plugins plugin instance(s).
   */
		unregister: function unregister(plugins) {
			var p = this._plugins;
			[].concat(plugins).forEach(function (plugin) {
				var idx = p.indexOf(plugin);
				if (idx !== -1) {
					p.splice(idx, 1);
				}
			});
		},

		/**
   * Remove all registered plugins.
   * @since 2.1.5
   */
		clear: function clear() {
			this._plugins = [];
		},

		/**
   * Returns the number of registered plugins?
   * @returns {Number}
   * @since 2.1.5
   */
		count: function count() {
			return this._plugins.length;
		},

		/**
   * Returns all registered plugin instances.
   * @returns {Array} array of plugin objects.
   * @since 2.1.5
   */
		getAll: function getAll() {
			return this._plugins;
		},

		/**
   * Calls registered plugins on the specified extension, with the given args. This
   * method immediately returns as soon as a plugin explicitly returns false. The
   * returned value can be used, for instance, to interrupt the current action.
   * @param {String} extension the name of the plugin method to call (e.g. 'beforeUpdate').
   * @param {Array} [args] extra arguments to apply to the extension call.
   * @returns {Boolean} false if any of the plugins return false, else returns true.
   */
		notify: function notify(extension, args) {
			var plugins = this._plugins;
			var ilen = plugins.length;
			var i, plugin;

			for (i = 0; i < ilen; ++i) {
				plugin = plugins[i];
				if (typeof plugin[extension] === 'function') {
					if (plugin[extension].apply(plugin, args || []) === false) {
						return false;
					}
				}
			}

			return true;
		}
	};

	/**
  * Plugin extension methods.
  * @interface Chart.PluginBase
  * @since 2.1.0
  */
	Chart.PluginBase = Chart.Element.extend({
		// Called at start of chart init
		beforeInit: noop,

		// Called at end of chart init
		afterInit: noop,

		// Called at start of update
		beforeUpdate: noop,

		// Called at end of update
		afterUpdate: noop,

		// Called at start of draw
		beforeDraw: noop,

		// Called at end of draw
		afterDraw: noop,

		// Called during destroy
		destroy: noop
	});

	/**
  * Provided for backward compatibility, use Chart.plugins instead
  * @namespace Chart.pluginService
  * @deprecated since version 2.1.5
  * @todo remove me at version 3
  */
	Chart.pluginService = Chart.plugins;
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUucGx1Z2luLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydHMiLCJDaGFydCIsIm5vb3AiLCJoZWxwZXJzIiwicGx1Z2lucyIsIl9wbHVnaW5zIiwicmVnaXN0ZXIiLCJwIiwiY29uY2F0IiwiZm9yRWFjaCIsInBsdWdpbiIsImluZGV4T2YiLCJwdXNoIiwidW5yZWdpc3RlciIsImlkeCIsInNwbGljZSIsImNsZWFyIiwiY291bnQiLCJsZW5ndGgiLCJnZXRBbGwiLCJub3RpZnkiLCJleHRlbnNpb24iLCJhcmdzIiwiaWxlbiIsImkiLCJhcHBseSIsIlBsdWdpbkJhc2UiLCJFbGVtZW50IiwiZXh0ZW5kIiwiYmVmb3JlSW5pdCIsImFmdGVySW5pdCIsImJlZm9yZVVwZGF0ZSIsImFmdGVyVXBkYXRlIiwiYmVmb3JlRHJhdyIsImFmdGVyRHJhdyIsImRlc3Ryb3kiLCJwbHVnaW5TZXJ2aWNlIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQUEsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxLQUFULEVBQWdCOztBQUVoQyxLQUFJQyxPQUFPRCxNQUFNRSxPQUFOLENBQWNELElBQXpCOztBQUVBOzs7OztBQUtBRCxPQUFNRyxPQUFOLEdBQWdCO0FBQ2ZDLFlBQVUsRUFESzs7QUFHZjs7OztBQUlBQyxZQUFVLGtCQUFTRixPQUFULEVBQWtCO0FBQzNCLE9BQUlHLElBQUksS0FBS0YsUUFBYjtBQUNDLEtBQUQsQ0FBS0csTUFBTCxDQUFZSixPQUFaLEVBQXFCSyxPQUFyQixDQUE2QixVQUFTQyxNQUFULEVBQWlCO0FBQzdDLFFBQUlILEVBQUVJLE9BQUYsQ0FBVUQsTUFBVixNQUFzQixDQUFDLENBQTNCLEVBQThCO0FBQzdCSCxPQUFFSyxJQUFGLENBQU9GLE1BQVA7QUFDQTtBQUNELElBSkQ7QUFLQSxHQWRjOztBQWdCZjs7OztBQUlBRyxjQUFZLG9CQUFTVCxPQUFULEVBQWtCO0FBQzdCLE9BQUlHLElBQUksS0FBS0YsUUFBYjtBQUNDLEtBQUQsQ0FBS0csTUFBTCxDQUFZSixPQUFaLEVBQXFCSyxPQUFyQixDQUE2QixVQUFTQyxNQUFULEVBQWlCO0FBQzdDLFFBQUlJLE1BQU1QLEVBQUVJLE9BQUYsQ0FBVUQsTUFBVixDQUFWO0FBQ0EsUUFBSUksUUFBUSxDQUFDLENBQWIsRUFBZ0I7QUFDZlAsT0FBRVEsTUFBRixDQUFTRCxHQUFULEVBQWMsQ0FBZDtBQUNBO0FBQ0QsSUFMRDtBQU1BLEdBNUJjOztBQThCZjs7OztBQUlBRSxTQUFPLGlCQUFXO0FBQ2pCLFFBQUtYLFFBQUwsR0FBZ0IsRUFBaEI7QUFDQSxHQXBDYzs7QUFzQ2Y7Ozs7O0FBS0FZLFNBQU8saUJBQVc7QUFDakIsVUFBTyxLQUFLWixRQUFMLENBQWNhLE1BQXJCO0FBQ0EsR0E3Q2M7O0FBK0NmOzs7OztBQUtBQyxVQUFRLGtCQUFXO0FBQ2xCLFVBQU8sS0FBS2QsUUFBWjtBQUNBLEdBdERjOztBQXdEZjs7Ozs7Ozs7QUFRQWUsVUFBUSxnQkFBU0MsU0FBVCxFQUFvQkMsSUFBcEIsRUFBMEI7QUFDakMsT0FBSWxCLFVBQVUsS0FBS0MsUUFBbkI7QUFDQSxPQUFJa0IsT0FBT25CLFFBQVFjLE1BQW5CO0FBQ0EsT0FBSU0sQ0FBSixFQUFPZCxNQUFQOztBQUVBLFFBQUtjLElBQUUsQ0FBUCxFQUFVQSxJQUFFRCxJQUFaLEVBQWtCLEVBQUVDLENBQXBCLEVBQXVCO0FBQ3RCZCxhQUFTTixRQUFRb0IsQ0FBUixDQUFUO0FBQ0EsUUFBSSxPQUFPZCxPQUFPVyxTQUFQLENBQVAsS0FBNkIsVUFBakMsRUFBNkM7QUFDNUMsU0FBSVgsT0FBT1csU0FBUCxFQUFrQkksS0FBbEIsQ0FBd0JmLE1BQXhCLEVBQWdDWSxRQUFRLEVBQXhDLE1BQWdELEtBQXBELEVBQTJEO0FBQzFELGFBQU8sS0FBUDtBQUNBO0FBQ0Q7QUFDRDs7QUFFRCxVQUFPLElBQVA7QUFDQTtBQS9FYyxFQUFoQjs7QUFrRkE7Ozs7O0FBS0FyQixPQUFNeUIsVUFBTixHQUFtQnpCLE1BQU0wQixPQUFOLENBQWNDLE1BQWQsQ0FBcUI7QUFDdkM7QUFDQUMsY0FBWTNCLElBRjJCOztBQUl2QztBQUNBNEIsYUFBVzVCLElBTDRCOztBQU92QztBQUNBNkIsZ0JBQWM3QixJQVJ5Qjs7QUFVdkM7QUFDQThCLGVBQWE5QixJQVgwQjs7QUFhdkM7QUFDQStCLGNBQVkvQixJQWQyQjs7QUFnQnZDO0FBQ0FnQyxhQUFXaEMsSUFqQjRCOztBQW1CdkM7QUFDQWlDLFdBQVNqQztBQXBCOEIsRUFBckIsQ0FBbkI7O0FBdUJBOzs7Ozs7QUFNQUQsT0FBTW1DLGFBQU4sR0FBc0JuQyxNQUFNRyxPQUE1QjtBQUNBLENBOUhEIiwiZmlsZSI6ImNvcmUucGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDaGFydCkge1xyXG5cclxuXHR2YXIgbm9vcCA9IENoYXJ0LmhlbHBlcnMubm9vcDtcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIHBsdWdpbiBzZXJ2aWNlIHNpbmdsZXRvblxyXG5cdCAqIEBuYW1lc3BhY2UgQ2hhcnQucGx1Z2luc1xyXG5cdCAqIEBzaW5jZSAyLjEuMFxyXG5cdCAqL1xyXG5cdENoYXJ0LnBsdWdpbnMgPSB7XHJcblx0XHRfcGx1Z2luczogW10sXHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBSZWdpc3RlcnMgdGhlIGdpdmVuIHBsdWdpbihzKSBpZiBub3QgYWxyZWFkeSByZWdpc3RlcmVkLlxyXG5cdFx0ICogQHBhcmFtIHtBcnJheXxPYmplY3R9IHBsdWdpbnMgcGx1Z2luIGluc3RhbmNlKHMpLlxyXG5cdFx0ICovXHJcblx0XHRyZWdpc3RlcjogZnVuY3Rpb24ocGx1Z2lucykge1xyXG5cdFx0XHR2YXIgcCA9IHRoaXMuX3BsdWdpbnM7XHJcblx0XHRcdChbXSkuY29uY2F0KHBsdWdpbnMpLmZvckVhY2goZnVuY3Rpb24ocGx1Z2luKSB7XHJcblx0XHRcdFx0aWYgKHAuaW5kZXhPZihwbHVnaW4pID09PSAtMSkge1xyXG5cdFx0XHRcdFx0cC5wdXNoKHBsdWdpbik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBVbnJlZ2lzdGVycyB0aGUgZ2l2ZW4gcGx1Z2luKHMpIG9ubHkgaWYgcmVnaXN0ZXJlZC5cclxuXHRcdCAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBwbHVnaW5zIHBsdWdpbiBpbnN0YW5jZShzKS5cclxuXHRcdCAqL1xyXG5cdFx0dW5yZWdpc3RlcjogZnVuY3Rpb24ocGx1Z2lucykge1xyXG5cdFx0XHR2YXIgcCA9IHRoaXMuX3BsdWdpbnM7XHJcblx0XHRcdChbXSkuY29uY2F0KHBsdWdpbnMpLmZvckVhY2goZnVuY3Rpb24ocGx1Z2luKSB7XHJcblx0XHRcdFx0dmFyIGlkeCA9IHAuaW5kZXhPZihwbHVnaW4pO1xyXG5cdFx0XHRcdGlmIChpZHggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRwLnNwbGljZShpZHgsIDEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUmVtb3ZlIGFsbCByZWdpc3RlcmVkIHBsdWdpbnMuXHJcblx0XHQgKiBAc2luY2UgMi4xLjVcclxuXHRcdCAqL1xyXG5cdFx0Y2xlYXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR0aGlzLl9wbHVnaW5zID0gW107XHJcblx0XHR9LFxyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUmV0dXJucyB0aGUgbnVtYmVyIG9mIHJlZ2lzdGVyZWQgcGx1Z2lucz9cclxuXHRcdCAqIEByZXR1cm5zIHtOdW1iZXJ9XHJcblx0XHQgKiBAc2luY2UgMi4xLjVcclxuXHRcdCAqL1xyXG5cdFx0Y291bnQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5fcGx1Z2lucy5sZW5ndGg7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8qKlxyXG5cdFx0ICogUmV0dXJucyBhbGwgcmVnaXN0ZXJlZCBwbHVnaW4gaW5zdGFuY2VzLlxyXG5cdFx0ICogQHJldHVybnMge0FycmF5fSBhcnJheSBvZiBwbHVnaW4gb2JqZWN0cy5cclxuXHRcdCAqIEBzaW5jZSAyLjEuNVxyXG5cdFx0ICovXHJcblx0XHRnZXRBbGw6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5fcGx1Z2lucztcclxuXHRcdH0sXHJcblxyXG5cdFx0LyoqXHJcblx0XHQgKiBDYWxscyByZWdpc3RlcmVkIHBsdWdpbnMgb24gdGhlIHNwZWNpZmllZCBleHRlbnNpb24sIHdpdGggdGhlIGdpdmVuIGFyZ3MuIFRoaXNcclxuXHRcdCAqIG1ldGhvZCBpbW1lZGlhdGVseSByZXR1cm5zIGFzIHNvb24gYXMgYSBwbHVnaW4gZXhwbGljaXRseSByZXR1cm5zIGZhbHNlLiBUaGVcclxuXHRcdCAqIHJldHVybmVkIHZhbHVlIGNhbiBiZSB1c2VkLCBmb3IgaW5zdGFuY2UsIHRvIGludGVycnVwdCB0aGUgY3VycmVudCBhY3Rpb24uXHJcblx0XHQgKiBAcGFyYW0ge1N0cmluZ30gZXh0ZW5zaW9uIHRoZSBuYW1lIG9mIHRoZSBwbHVnaW4gbWV0aG9kIHRvIGNhbGwgKGUuZy4gJ2JlZm9yZVVwZGF0ZScpLlxyXG5cdFx0ICogQHBhcmFtIHtBcnJheX0gW2FyZ3NdIGV4dHJhIGFyZ3VtZW50cyB0byBhcHBseSB0byB0aGUgZXh0ZW5zaW9uIGNhbGwuXHJcblx0XHQgKiBAcmV0dXJucyB7Qm9vbGVhbn0gZmFsc2UgaWYgYW55IG9mIHRoZSBwbHVnaW5zIHJldHVybiBmYWxzZSwgZWxzZSByZXR1cm5zIHRydWUuXHJcblx0XHQgKi9cclxuXHRcdG5vdGlmeTogZnVuY3Rpb24oZXh0ZW5zaW9uLCBhcmdzKSB7XHJcblx0XHRcdHZhciBwbHVnaW5zID0gdGhpcy5fcGx1Z2lucztcclxuXHRcdFx0dmFyIGlsZW4gPSBwbHVnaW5zLmxlbmd0aDtcclxuXHRcdFx0dmFyIGksIHBsdWdpbjtcclxuXHJcblx0XHRcdGZvciAoaT0wOyBpPGlsZW47ICsraSkge1xyXG5cdFx0XHRcdHBsdWdpbiA9IHBsdWdpbnNbaV07XHJcblx0XHRcdFx0aWYgKHR5cGVvZiBwbHVnaW5bZXh0ZW5zaW9uXSA9PT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0XHRcdFx0aWYgKHBsdWdpbltleHRlbnNpb25dLmFwcGx5KHBsdWdpbiwgYXJncyB8fCBbXSkgPT09IGZhbHNlKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBsdWdpbiBleHRlbnNpb24gbWV0aG9kcy5cclxuXHQgKiBAaW50ZXJmYWNlIENoYXJ0LlBsdWdpbkJhc2VcclxuXHQgKiBAc2luY2UgMi4xLjBcclxuXHQgKi9cclxuXHRDaGFydC5QbHVnaW5CYXNlID0gQ2hhcnQuRWxlbWVudC5leHRlbmQoe1xyXG5cdFx0Ly8gQ2FsbGVkIGF0IHN0YXJ0IG9mIGNoYXJ0IGluaXRcclxuXHRcdGJlZm9yZUluaXQ6IG5vb3AsXHJcblxyXG5cdFx0Ly8gQ2FsbGVkIGF0IGVuZCBvZiBjaGFydCBpbml0XHJcblx0XHRhZnRlckluaXQ6IG5vb3AsXHJcblxyXG5cdFx0Ly8gQ2FsbGVkIGF0IHN0YXJ0IG9mIHVwZGF0ZVxyXG5cdFx0YmVmb3JlVXBkYXRlOiBub29wLFxyXG5cclxuXHRcdC8vIENhbGxlZCBhdCBlbmQgb2YgdXBkYXRlXHJcblx0XHRhZnRlclVwZGF0ZTogbm9vcCxcclxuXHJcblx0XHQvLyBDYWxsZWQgYXQgc3RhcnQgb2YgZHJhd1xyXG5cdFx0YmVmb3JlRHJhdzogbm9vcCxcclxuXHJcblx0XHQvLyBDYWxsZWQgYXQgZW5kIG9mIGRyYXdcclxuXHRcdGFmdGVyRHJhdzogbm9vcCxcclxuXHJcblx0XHQvLyBDYWxsZWQgZHVyaW5nIGRlc3Ryb3lcclxuXHRcdGRlc3Ryb3k6IG5vb3BcclxuXHR9KTtcclxuXHJcblx0LyoqXHJcblx0ICogUHJvdmlkZWQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHksIHVzZSBDaGFydC5wbHVnaW5zIGluc3RlYWRcclxuXHQgKiBAbmFtZXNwYWNlIENoYXJ0LnBsdWdpblNlcnZpY2VcclxuXHQgKiBAZGVwcmVjYXRlZCBzaW5jZSB2ZXJzaW9uIDIuMS41XHJcblx0ICogQHRvZG8gcmVtb3ZlIG1lIGF0IHZlcnNpb24gM1xyXG5cdCAqL1xyXG5cdENoYXJ0LnBsdWdpblNlcnZpY2UgPSBDaGFydC5wbHVnaW5zO1xyXG59O1xyXG4iXX0=