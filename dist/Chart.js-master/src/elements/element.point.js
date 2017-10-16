'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers,
	    globalOpts = Chart.defaults.global,
	    defaultColor = globalOpts.defaultColor;

	globalOpts.elements.point = {
		radius: 3,
		pointStyle: 'circle',
		backgroundColor: defaultColor,
		borderWidth: 1,
		borderColor: defaultColor,
		// Hover
		hitRadius: 1,
		hoverRadius: 4,
		hoverBorderWidth: 1
	};

	function xRange(mouseX) {
		var vm = this._view;
		return vm ? Math.pow(mouseX - vm.x, 2) < Math.pow(vm.radius + vm.hitRadius, 2) : false;
	}

	function yRange(mouseY) {
		var vm = this._view;
		return vm ? Math.pow(mouseY - vm.y, 2) < Math.pow(vm.radius + vm.hitRadius, 2) : false;
	}

	Chart.elements.Point = Chart.Element.extend({
		inRange: function inRange(mouseX, mouseY) {
			var vm = this._view;
			return vm ? Math.pow(mouseX - vm.x, 2) + Math.pow(mouseY - vm.y, 2) < Math.pow(vm.hitRadius + vm.radius, 2) : false;
		},

		inLabelRange: xRange,
		inXRange: xRange,
		inYRange: yRange,

		getCenterPoint: function getCenterPoint() {
			var vm = this._view;
			return {
				x: vm.x,
				y: vm.y
			};
		},
		getArea: function getArea() {
			return Math.PI * Math.pow(this._view.radius, 2);
		},
		tooltipPosition: function tooltipPosition() {
			var vm = this._view;
			return {
				x: vm.x,
				y: vm.y,
				padding: vm.radius + vm.borderWidth
			};
		},
		draw: function draw() {
			var vm = this._view;
			var ctx = this._chart.ctx;
			var pointStyle = vm.pointStyle;
			var radius = vm.radius;
			var x = vm.x;
			var y = vm.y;

			if (vm.skip) {
				return;
			}

			ctx.setStrokeStyle(vm.borderColor || defaultColor);
			ctx.setLineWidth(helpers.getValueOrDefault(vm.borderWidth, globalOpts.elements.point.borderWidth));
			ctx.setFillStyle(vm.backgroundColor || defaultColor);

			Chart.canvasHelpers.drawPoint(ctx, pointStyle, radius, x, y);
		}
	});
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVsZW1lbnQucG9pbnQuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0cyIsIkNoYXJ0IiwiaGVscGVycyIsImdsb2JhbE9wdHMiLCJkZWZhdWx0cyIsImdsb2JhbCIsImRlZmF1bHRDb2xvciIsImVsZW1lbnRzIiwicG9pbnQiLCJyYWRpdXMiLCJwb2ludFN0eWxlIiwiYmFja2dyb3VuZENvbG9yIiwiYm9yZGVyV2lkdGgiLCJib3JkZXJDb2xvciIsImhpdFJhZGl1cyIsImhvdmVyUmFkaXVzIiwiaG92ZXJCb3JkZXJXaWR0aCIsInhSYW5nZSIsIm1vdXNlWCIsInZtIiwiX3ZpZXciLCJNYXRoIiwicG93IiwieCIsInlSYW5nZSIsIm1vdXNlWSIsInkiLCJQb2ludCIsIkVsZW1lbnQiLCJleHRlbmQiLCJpblJhbmdlIiwiaW5MYWJlbFJhbmdlIiwiaW5YUmFuZ2UiLCJpbllSYW5nZSIsImdldENlbnRlclBvaW50IiwiZ2V0QXJlYSIsIlBJIiwidG9vbHRpcFBvc2l0aW9uIiwicGFkZGluZyIsImRyYXciLCJjdHgiLCJfY2hhcnQiLCJza2lwIiwic2V0U3Ryb2tlU3R5bGUiLCJzZXRMaW5lV2lkdGgiLCJnZXRWYWx1ZU9yRGVmYXVsdCIsInNldEZpbGxTdHlsZSIsImNhbnZhc0hlbHBlcnMiLCJkcmF3UG9pbnQiXSwibWFwcGluZ3MiOiJBQUFBOztBQUVBQSxPQUFPQyxPQUFQLEdBQWlCLFVBQVNDLEtBQVQsRUFBZ0I7O0FBRWhDLEtBQUlDLFVBQVVELE1BQU1DLE9BQXBCO0FBQUEsS0FDQ0MsYUFBYUYsTUFBTUcsUUFBTixDQUFlQyxNQUQ3QjtBQUFBLEtBRUNDLGVBQWVILFdBQVdHLFlBRjNCOztBQUlBSCxZQUFXSSxRQUFYLENBQW9CQyxLQUFwQixHQUE0QjtBQUMzQkMsVUFBUSxDQURtQjtBQUUzQkMsY0FBWSxRQUZlO0FBRzNCQyxtQkFBaUJMLFlBSFU7QUFJM0JNLGVBQWEsQ0FKYztBQUszQkMsZUFBYVAsWUFMYztBQU0zQjtBQUNBUSxhQUFX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RUFBbUM5QixVQUFuQyxFQUErQ0QsTUFBL0MsRUFBdURjLENBQXZELEVBQTBERyxDQUExRDtBQUNBO0FBN0MwQyxFQUFyQixDQUF2QjtBQStDQSxDQTNFRCIsImZpbGUiOiJlbGVtZW50LnBvaW50LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDaGFydCkge1xyXG5cclxuXHR2YXIgaGVscGVycyA9IENoYXJ0LmhlbHBlcnMsXHJcblx0XHRnbG9iYWxPcHRzID0gQ2hhcnQuZGVmYXVsdHMuZ2xvYmFsLFxyXG5cdFx0ZGVmYXVsdENvbG9yID0gZ2xvYmFsT3B0cy5kZWZhdWx0Q29sb3I7XHJcblxyXG5cdGdsb2JhbE9wdHMuZWxlbWVudHMucG9pbnQgPSB7XHJcblx0XHRyYWRpdXM6IDMsXHJcblx0XHRwb2ludFN0eWxlOiAnY2lyY2xlJyxcclxuXHRcdGJhY2tncm91bmRDb2xvcjogZGVmYXVsdENvbG9yLFxyXG5cdFx0Ym9yZGVyV2lkdGg6IDEsXHJcblx0XHRib3JkZXJDb2xvcjogZGVmYXVsdENvbG9yLFxyXG5cdFx0Ly8gSG92ZXJcclxuXHRcdGhpdFJhZGl1czogMSxcclxuXHRcdGhvdmVyUmFkaXVzOiA0LFxyXG5cdFx0aG92ZXJCb3JkZXJXaWR0aDogMVxyXG5cdH07XHJcblxyXG5cdGZ1bmN0aW9uIHhSYW5nZShtb3VzZVgpIHtcclxuXHRcdHZhciB2bSA9IHRoaXMuX3ZpZXc7XHJcblx0XHRyZXR1cm4gdm0gPyAoTWF0aC5wb3cobW91c2VYIC0gdm0ueCwgMikgPCBNYXRoLnBvdyh2bS5yYWRpdXMgKyB2bS5oaXRSYWRpdXMsIDIpKSA6IGZhbHNlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24geVJhbmdlKG1vdXNlWSkge1xyXG5cdFx0dmFyIHZtID0gdGhpcy5fdmlldztcclxuXHRcdHJldHVybiB2bSA/IChNYXRoLnBvdyhtb3VzZVkgLSB2bS55LCAyKSA8IE1hdGgucG93KHZtLnJhZGl1cyArIHZtLmhpdFJhZGl1cywgMikpIDogZmFsc2U7XHJcblx0fVxyXG5cclxuXHRDaGFydC5lbGVtZW50cy5Qb2ludCA9IENoYXJ0LkVsZW1lbnQuZXh0ZW5kKHtcclxuXHRcdGluUmFuZ2U6IGZ1bmN0aW9uKG1vdXNlWCwgbW91c2VZKSB7XHJcblx0XHRcdHZhciB2bSA9IHRoaXMuX3ZpZXc7XHJcblx0XHRcdHJldHVybiB2bSA/ICgoTWF0aC5wb3cobW91c2VYIC0gdm0ueCwgMikgKyBNYXRoLnBvdyhtb3VzZVkgLSB2bS55LCAyKSkgPCBNYXRoLnBvdyh2bS5oaXRSYWRpdXMgKyB2bS5yYWRpdXMsIDIpKSA6IGZhbHNlO1xyXG5cdFx0fSxcclxuXHJcblx0XHRpbkxhYmVsUmFuZ2U6IHhSYW5nZSxcclxuXHRcdGluWFJhbmdlOiB4UmFuZ2UsXHJcblx0XHRpbllSYW5nZTogeVJhbmdlLFxyXG5cclxuXHRcdGdldENlbnRlclBvaW50OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIHZtID0gdGhpcy5fdmlldztcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR4OiB2bS54LFxyXG5cdFx0XHRcdHk6IHZtLnlcclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblx0XHRnZXRBcmVhOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0cmV0dXJuIE1hdGguUEkgKiBNYXRoLnBvdyh0aGlzLl92aWV3LnJhZGl1cywgMik7XHJcblx0XHR9LFxyXG5cdFx0dG9vbHRpcFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIHZtID0gdGhpcy5fdmlldztcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR4OiB2bS54LFxyXG5cdFx0XHRcdHk6IHZtLnksXHJcblx0XHRcdFx0cGFkZGluZzogdm0ucmFkaXVzICsgdm0uYm9yZGVyV2lkdGhcclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblx0XHRkcmF3OiBmdW5jdGlvbigpIHtcclxuXHRcdFx0dmFyIHZtID0gdGhpcy5fdmlldztcclxuXHRcdFx0dmFyIGN0eCA9IHRoaXMuX2NoYXJ0LmN0eDtcclxuXHRcdFx0dmFyIHBvaW50U3R5bGUgPSB2bS5wb2ludFN0eWxlO1xyXG5cdFx0XHR2YXIgcmFkaXVzID0gdm0ucmFkaXVzO1xyXG5cdFx0XHR2YXIgeCA9IHZtLng7XHJcblx0XHRcdHZhciB5ID0gdm0ueTtcclxuXHJcblx0XHRcdGlmICh2bS5za2lwKSB7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjdHguc2V0U3Ryb2tlU3R5bGUodm0uYm9yZGVyQ29sb3IgfHwgZGVmYXVsdENvbG9yKTtcclxuXHRcdFx0Y3R4LnNldExpbmVXaWR0aChoZWxwZXJzLmdldFZhbHVlT3JEZWZhdWx0KHZtLmJvcmRlcldpZHRoLCBnbG9iYWxPcHRzLmVsZW1lbnRzLnBvaW50LmJvcmRlcldpZHRoKSk7XHJcblx0XHRcdGN0eC5zZXRGaWxsU3R5bGUodm0uYmFja2dyb3VuZENvbG9yIHx8IGRlZmF1bHRDb2xvcik7XHJcblxyXG5cdFx0XHRDaGFydC5jYW52YXNIZWxwZXJzLmRyYXdQb2ludChjdHgsIHBvaW50U3R5bGUsIHJhZGl1cywgeCwgeSk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcbiJdfQ==