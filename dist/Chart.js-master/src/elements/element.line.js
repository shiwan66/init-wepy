'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;
	var globalDefaults = Chart.defaults.global;

	Chart.defaults.global.elements.line = {
		tension: 0.4,
		backgroundColor: globalDefaults.defaultColor,
		borderWidth: 3,
		borderColor: globalDefaults.defaultColor,
		borderCapStyle: 'butt',
		borderDash: [],
		borderDashOffset: 0.0,
		borderJoinStyle: 'miter',
		capBezierPoints: true,
		fill: true // do we fill in the area between the line and its base axis
	};

	Chart.elements.Line = Chart.Element.extend({
		draw: function draw() {
			var me = this;
			var vm = me._view;
			var spanGaps = vm.spanGaps;
			var fillPoint = vm.scaleZero;
			var loop = me._loop;

			// Handle different fill modes for cartesian lines
			if (!loop) {
				if (vm.fill === 'top') {
					fillPoint = vm.scaleTop;
				} else if (vm.fill === 'bottom') {
					fillPoint = vm.scaleBottom;
				}
			}

			var ctx = me._chart.ctx;
			ctx.save();

			// Helper function to draw a line to a point
			function lineToPoint(previousPoint, point) {
				var pointVM = point._view;
				if (point._view.steppedLine === true) {
					ctx.lineTo(pointVM.x, previousPoint._view.y);
					ctx.lineTo(pointVM.x, pointVM.y);
				} else if (point._view.tension === 0) {
					ctx.lineTo(pointVM.x, pointVM.y);
				} else {
					ctx.bezierCurveTo(previousPoint._view.controlPointNextX, previousPoint._view.controlPointNextY, pointVM.controlPointPreviousX, pointVM.controlPointPreviousY, pointVM.x, pointVM.y);
				}
			}

			var points = me._children.slice(); // clone array
			var lastDrawnIndex = -1;

			// If we are looping, adding the first point again
			if (loop && points.length) {
				points.push(points[0]);
			}

			var index, current, previous, currentVM;

			// Fill Line
			if (points.length && vm.fill) {
				ctx.beginPath();

				for (index = 0; index < points.length; ++index) {
					current = points[index];
					previous = helpers.previousItem(points, index);
					currentVM = current._view;

					// First point moves to it's starting position no matter what
					if (index === 0) {
						if (loop) {
							ctx.moveTo(fillPoint.x, fillPoint.y);
						} else {
							ctx.moveTo(currentVM.x, fillPoint);
						}

						if (!currentVM.skip) {
							lastDrawnIndex = index;
							ctx.lineTo(currentVM.x, currentVM.y);
						}
					} else {
						previous = lastDrawnIndex === -1 ? previous : points[lastDrawnIndex];

						if (currentVM.skip) {
							// Only do this if this is the first point that is skipped
							if (!spanGaps && lastDrawnIndex === index - 1) {
								if (loop) {
									ctx.lineTo(fillPoint.x, fillPoint.y);
								} else {
									ctx.lineTo(previous._view.x, fillPoint);
								}
							}
						} else {
							if (lastDrawnIndex !== index - 1) {
								// There was a gap and this is the first point after the gap. If we've never drawn a point, this is a special case.
								// If the first data point is NaN, then there is no real gap to skip
								if (spanGaps && lastDrawnIndex !== -1) {
									// We are spanning the gap, so simple draw a line to this point
									lineToPoint(previous, current);
								} else if (loop) {
									ctx.lineTo(currentVM.x, currentVM.y);
								} else {
									ctx.lineTo(currentVM.x, fillPoint);
									ctx.lineTo(currentVM.x, currentVM.y);
								}
							} else {
								// Line to next point
								lineToPoint(previous, current);
							}
							lastDrawnIndex = index;
						}
					}
				}

				if (!loop && lastDrawnIndex !== -1) {
					ctx.lineTo(points[lastDrawnIndex]._view.x, fillPoint);
				}

				ctx.setFillStyle(vm.backgroundColor || globalDefaults.defaultColor);
				ctx.closePath();
				ctx.fill();
			}

			// Stroke Line Options
			var globalOptionLineElements = globalDefaults.elements.line;
			ctx.setLineCap(vm.borderCapStyle || globalOptionLineElements.borderCapStyle);

			// IE 9 and 10 do not support line dash
			if (ctx.setLineDash) {
				ctx.setLineDash(vm.borderDash || globalOptionLineElements.borderDash);
			}

			ctx.lineDashOffset = vm.borderDashOffset || globalOptionLineElements.borderDashOffset;
			ctx.setLineJoin(vm.borderJoinStyle || globalOptionLineElements.borderJoinStyle);
			ctx.setLineWidth(vm.borderWidth || globalOptionLineElements.borderWidth);
			ctx.setStrokeStyle(vm.borderColor || globalDefaults.defaultColor);

			// Stroke Line
			ctx.beginPath();
			lastDrawnIndex = -1;

			for (index = 0; index < points.length; ++index) {
				current = points[index];
				previous = helpers.previousItem(points, index);
				currentVM = current._view;

				// First point moves to it's starting position no matter what
				if (index === 0) {
					if (!currentVM.skip) {
						ctx.moveTo(currentVM.x, currentVM.y);
						lastDrawnIndex = index;
					}
				} else {
					previous = lastDrawnIndex === -1 ? previous : points[lastDrawnIndex];

					if (!currentVM.skip) {
						if (lastDrawnIndex !== index - 1 && !spanGaps || lastDrawnIndex === -1) {
							// There was a gap and this is the first point after the gap
							ctx.moveTo(currentVM.x, currentVM.y);
						} else {
							// Line to next point
							lineToPoint(previous, current);
						}
						lastDrawnIndex = index;
					}
				}
			}

			ctx.stroke();
			ctx.restore();
		}
	});
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVsZW1lbnQubGluZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwiQ2hhcnQiLCJoZWxwZXJzIiwiZ2xvYmFsRGVmYXVsdHMiLCJkZWZhdWx0cyIsImdsb2JhbCIsImVsZW1lbnRzIiwibGluZSIsInRlbnNpb24iLCJiYWNrZ3JvdW5kQ29sb3IiLCJkZWZhdWx0Q29sb3IiLCJib3JkZXJXaWR0aCIsImJvcmRlckNvbG9yIiwiYm9yZGVyQ2FwU3R5bGUiLCJib3JkZXJEYXNoIiwiYm9yZGVyRGFzaE9mZnNldCIsImJvcmRlckpvaW5TdHlsZSIsImNhcEJlemllclBvaW50cyIsImZpbGwiLCJMaW5lIiwiRWxlbWVudCIsImV4dGVuZCIsImRyYXciLCJtZSIsInZtIiwiX3ZpZXciLCJzcGFuR2FwcyIsImZpbGxQb2ludCIsInNjYWxlWmVybyIsImxvb3AiLCJfbG9vcCIsInNjYWxlVG9wIiwic2NhbGVCb3R0b20iLCJjdHgiLCJfY2hhcnQiLCJzYXZlIiwibGluZVRvUG9pbnQiLCJwcmV2aW91c1BvaW50IiwicG9pbnQiLCJwb2ludFZNIiwic3RlcHBlZExpbmUiLCJsaW5lVG8iLCJ4IiwieSIsImJlemllckN1cnZlVG8iLCJjb250cm9sUG9pbnROZXh0WCIsImNvbnRyb2xQb2ludE5leHRZIiwiY29udHJvbFBvaW50UHJldmlvdXNYIiwiY29udHJvbFBvaW50UHJldmlvdXNZIiwicG9pbnRzIiwiX2NoaWxkcmVuIiwic2xpY2UiLCJsYXN0RHJhd25JbmRleCIsImxlbmd0aCIsInB1c2giLCJpbmRleCIsImN1cnJlbnQiLCJwcmV2aW91cyIsImN1cnJlbnRWTSIsImJlZ2luUGF0aCIsInByZXZpb3VzSXRlbSIsIm1vdmVUbyIsInNraXAiLCJzZXRGaWxsU3R5bGUiLCJjbG9zZVBhdGgiLCJnbG9iYWxPcHRpb25MaW5lRWxlbWVudHMiLCJzZXRMaW5lQ2FwIiwic2V0TGluZURhc2giLCJsaW5lRGFzaE9mZnNldCIsInNldExpbmVKb2luIiwic2V0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SjtBQUNBdkMsT0FBSXdDLE9BQUo7QUFDQTtBQWpLeUMsRUFBckIsQ0FBdEI7QUFtS0EsQ0FyTEQiLCJmaWxlIjoiZWxlbWVudC5saW5lLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihDaGFydCkge1xyXG5cclxuXHR2YXIgaGVscGVycyA9IENoYXJ0LmhlbHBlcnM7XHJcblx0dmFyIGdsb2JhbERlZmF1bHRzID0gQ2hhcnQuZGVmYXVsdHMuZ2xvYmFsO1xyXG5cclxuXHRDaGFydC5kZWZhdWx0cy5nbG9iYWwuZWxlbWVudHMubGluZSA9IHtcclxuXHRcdHRlbnNpb246IDAuNCxcclxuXHRcdGJhY2tncm91bmRDb2xvcjogZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdENvbG9yLFxyXG5cdFx0Ym9yZGVyV2lkdGg6IDMsXHJcblx0XHRib3JkZXJDb2xvcjogZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdENvbG9yLFxyXG5cdFx0Ym9yZGVyQ2FwU3R5bGU6ICdidXR0JyxcclxuXHRcdGJvcmRlckRhc2g6IFtdLFxyXG5cdFx0Ym9yZGVyRGFzaE9mZnNldDogMC4wLFxyXG5cdFx0Ym9yZGVySm9pblN0eWxlOiAnbWl0ZXInLFxyXG5cdFx0Y2FwQmV6aWVyUG9pbnRzOiB0cnVlLFxyXG5cdFx0ZmlsbDogdHJ1ZSwgLy8gZG8gd2UgZmlsbCBpbiB0aGUgYXJlYSBiZXR3ZWVuIHRoZSBsaW5lIGFuZCBpdHMgYmFzZSBheGlzXHJcblx0fTtcclxuXHJcblx0Q2hhcnQuZWxlbWVudHMuTGluZSA9IENoYXJ0LkVsZW1lbnQuZXh0ZW5kKHtcclxuXHRcdGRyYXc6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0XHR2YXIgdm0gPSBtZS5fdmlldztcclxuXHRcdFx0dmFyIHNwYW5HYXBzID0gdm0uc3BhbkdhcHM7XHJcblx0XHRcdHZhciBmaWxsUG9pbnQgPSB2bS5zY2FsZVplcm87XHJcblx0XHRcdHZhciBsb29wID0gbWUuX2xvb3A7XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgZGlmZmVyZW50IGZpbGwgbW9kZXMgZm9yIGNhcnRlc2lhbiBsaW5lc1xyXG5cdFx0XHRpZiAoIWxvb3ApIHtcclxuXHRcdFx0XHRpZiAodm0uZmlsbCA9PT0gJ3RvcCcpIHtcclxuXHRcdFx0XHRcdGZpbGxQb2ludCA9IHZtLnNjYWxlVG9wO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodm0uZmlsbCA9PT0gJ2JvdHRvbScpIHtcclxuXHRcdFx0XHRcdGZpbGxQb2ludCA9IHZtLnNjYWxlQm90dG9tO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIGN0eCA9IG1lLl9jaGFydC5jdHg7XHJcblx0XHRcdGN0eC5zYXZlKCk7XHJcblxyXG5cdFx0XHQvLyBIZWxwZXIgZnVuY3Rpb24gdG8gZHJhdyBhIGxpbmUgdG8gYSBwb2ludFxyXG5cdFx0XHRmdW5jdGlvbiBsaW5lVG9Qb2ludChwcmV2aW91c1BvaW50LCBwb2ludCkge1xyXG5cdFx0XHRcdHZhciBwb2ludFZNID0gcG9pbnQuX3ZpZXc7XHJcblx0XHRcdFx0aWYgKHBvaW50Ll92aWV3LnN0ZXBwZWRMaW5lID09PSB0cnVlKSB7XHJcblx0XHRcdFx0XHRjdHgubGluZVRvKHBvaW50Vk0ueCwgcHJldmlvdXNQb2ludC5fdmlldy55KTtcclxuXHRcdFx0XHRcdGN0eC5saW5lVG8ocG9pbnRWTS54LCBwb2ludFZNLnkpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAocG9pbnQuX3ZpZXcudGVuc2lvbiA9PT0gMCkge1xyXG5cdFx0XHRcdFx0Y3R4LmxpbmVUbyhwb2ludFZNLngsIHBvaW50Vk0ueSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGN0eC5iZXppZXJDdXJ2ZVRvKFxyXG5cdFx0XHRcdFx0XHRwcmV2aW91c1BvaW50Ll92aWV3LmNvbnRyb2xQb2ludE5leHRYLFxyXG5cdFx0XHRcdFx0XHRwcmV2aW91c1BvaW50Ll92aWV3LmNvbnRyb2xQb2ludE5leHRZLFxyXG5cdFx0XHRcdFx0XHRwb2ludFZNLmNvbnRyb2xQb2ludFByZXZpb3VzWCxcclxuXHRcdFx0XHRcdFx0cG9pbnRWTS5jb250cm9sUG9pbnRQcmV2aW91c1ksXHJcblx0XHRcdFx0XHRcdHBvaW50Vk0ueCxcclxuXHRcdFx0XHRcdFx0cG9pbnRWTS55XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHBvaW50cyA9IG1lLl9jaGlsZHJlbi5zbGljZSgpOyAvLyBjbG9uZSBhcnJheVxyXG5cdFx0XHR2YXIgbGFzdERyYXduSW5kZXggPSAtMTtcclxuXHJcblx0XHRcdC8vIElmIHdlIGFyZSBsb29waW5nLCBhZGRpbmcgdGhlIGZpcnN0IHBvaW50IGFnYWluXHJcblx0XHRcdGlmIChsb29wICYmIHBvaW50cy5sZW5ndGgpIHtcclxuXHRcdFx0XHRwb2ludHMucHVzaChwb2ludHNbMF0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgaW5kZXgsIGN1cnJlbnQsIHByZXZpb3VzLCBjdXJyZW50Vk07XHJcblxyXG5cdFx0XHQvLyBGaWxsIExpbmVcclxuXHRcdFx0aWYgKHBvaW50cy5sZW5ndGggJiYgdm0uZmlsbCkge1xyXG5cdFx0XHRcdGN0eC5iZWdpblBhdGgoKTtcclxuXHJcblx0XHRcdFx0Zm9yIChpbmRleCA9IDA7IGluZGV4IDwgcG9pbnRzLmxlbmd0aDsgKytpbmRleCkge1xyXG5cdFx0XHRcdFx0Y3VycmVudCA9IHBvaW50c1tpbmRleF07XHJcblx0XHRcdFx0XHRwcmV2aW91cyA9IGhlbHBlcnMucHJldmlvdXNJdGVtKHBvaW50cywgaW5kZXgpO1xyXG5cdFx0XHRcdFx0Y3VycmVudFZNID0gY3VycmVudC5fdmlldztcclxuXHJcblx0XHRcdFx0XHQvLyBGaXJzdCBwb2ludCBtb3ZlcyB0byBpdCdzIHN0YXJ0aW5nIHBvc2l0aW9uIG5vIG1hdHRlciB3aGF0XHJcblx0XHRcdFx0XHRpZiAoaW5kZXggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0aWYgKGxvb3ApIHtcclxuXHRcdFx0XHRcdFx0XHRjdHgubW92ZVRvKGZpbGxQb2ludC54LCBmaWxsUG9pbnQueSk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0Y3R4Lm1vdmVUbyhjdXJyZW50Vk0ueCwgZmlsbFBvaW50KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0aWYgKCFjdXJyZW50Vk0uc2tpcCkge1xyXG5cdFx0XHRcdFx0XHRcdGxhc3REcmF3bkluZGV4ID0gaW5kZXg7XHJcblx0XHRcdFx0XHRcdFx0Y3R4LmxpbmVUbyhjdXJyZW50Vk0ueCwgY3VycmVudFZNLnkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRwcmV2aW91cyA9IGxhc3REcmF3bkluZGV4ID09PSAtMSA/IHByZXZpb3VzIDogcG9pbnRzW2xhc3REcmF3bkluZGV4XTtcclxuXHJcblx0XHRcdFx0XHRcdGlmIChjdXJyZW50Vk0uc2tpcCkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIE9ubHkgZG8gdGhpcyBpZiB0aGlzIGlzIHRoZSBmaXJzdCBwb2ludCB0aGF0IGlzIHNraXBwZWRcclxuXHRcdFx0XHRcdFx0XHRpZiAoIXNwYW5HYXBzICYmIGxhc3REcmF3bkluZGV4ID09PSAoaW5kZXggLSAxKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGxvb3ApIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y3R4LmxpbmVUbyhmaWxsUG9pbnQueCwgZmlsbFBvaW50LnkpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y3R4LmxpbmVUbyhwcmV2aW91cy5fdmlldy54LCBmaWxsUG9pbnQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRpZiAobGFzdERyYXduSW5kZXggIT09IChpbmRleCAtIDEpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBUaGVyZSB3YXMgYSBnYXAgYW5kIHRoaXMgaXMgdGhlIGZpcnN0IHBvaW50IGFmdGVyIHRoZSBnYXAuIElmIHdlJ3ZlIG5ldmVyIGRyYXduIGEgcG9pbnQsIHRoaXMgaXMgYSBzcGVjaWFsIGNhc2UuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBJZiB0aGUgZmlyc3QgZGF0YSBwb2ludCBpcyBOYU4sIHRoZW4gdGhlcmUgaXMgbm8gcmVhbCBnYXAgdG8gc2tpcFxyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHNwYW5HYXBzICYmIGxhc3REcmF3bkluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBXZSBhcmUgc3Bhbm5pbmcgdGhlIGdhcCwgc28gc2ltcGxlIGRyYXcgYSBsaW5lIHRvIHRoaXMgcG9pbnRcclxuXHRcdFx0XHRcdFx0XHRcdFx0bGluZVRvUG9pbnQocHJldmlvdXMsIGN1cnJlbnQpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChsb29wKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGN0eC5saW5lVG8oY3VycmVudFZNLngsIGN1cnJlbnRWTS55KTtcclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGN0eC5saW5lVG8oY3VycmVudFZNLngsIGZpbGxQb2ludCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGN0eC5saW5lVG8oY3VycmVudFZNLngsIGN1cnJlbnRWTS55KTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gTGluZSB0byBuZXh0IHBvaW50XHJcblx0XHRcdFx0XHRcdFx0XHRsaW5lVG9Qb2ludChwcmV2aW91cywgY3VycmVudCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGxhc3REcmF3bkluZGV4ID0gaW5kZXg7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmICghbG9vcCAmJiBsYXN0RHJhd25JbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdGN0eC5saW5lVG8ocG9pbnRzW2xhc3REcmF3bkluZGV4XS5fdmlldy54LCBmaWxsUG9pbnQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y3R4LnNldEZpbGxTdHlsZSh2bS5iYWNrZ3JvdW5kQ29sb3IgfHwgZ2xvYmFsRGVmYXVsdHMuZGVmYXVsdENvbG9yKTtcclxuXHRcdFx0XHRjdHguY2xvc2VQYXRoKCk7XHJcblx0XHRcdFx0Y3R4LmZpbGwoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU3Ryb2tlIExpbmUgT3B0aW9uc1xyXG5cdFx0XHR2YXIgZ2xvYmFsT3B0aW9uTGluZUVsZW1lbnRzID0gZ2xvYmFsRGVmYXVsdHMuZWxlbWVudHMubGluZTtcclxuXHRcdFx0Y3R4LnNldExpbmVDYXAodm0uYm9yZGVyQ2FwU3R5bGUgfHwgZ2xvYmFsT3B0aW9uTGluZUVsZW1lbnRzLmJvcmRlckNhcFN0eWxlKTtcclxuXHJcblx0XHRcdC8vIElFIDkgYW5kIDEwIGRvIG5vdCBzdXBwb3J0IGxpbmUgZGFzaFxyXG5cdFx0XHRpZiAoY3R4LnNldExpbmVEYXNoKSB7XHJcblx0XHRcdFx0Y3R4LnNldExpbmVEYXNoKHZtLmJvcmRlckRhc2ggfHwgZ2xvYmFsT3B0aW9uTGluZUVsZW1lbnRzLmJvcmRlckRhc2gpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjdHgubGluZURhc2hPZmZzZXQgPSB2bS5ib3JkZXJEYXNoT2Zmc2V0IHx8IGdsb2JhbE9wdGlvbkxpbmVFbGVtZW50cy5ib3JkZXJEYXNoT2Zmc2V0O1xyXG5cdFx0XHRjdHguc2V0TGluZUpvaW4odm0uYm9yZGVySm9pblN0eWxlIHx8IGdsb2JhbE9wdGlvbkxpbmVFbGVtZW50cy5ib3JkZXJKb2luU3R5bGUpO1xyXG5cdFx0XHRjdHguc2V0TGluZVdpZHRoKHZtLmJvcmRlcldpZHRoIHx8IGdsb2JhbE9wdGlvbkxpbmVFbGVtZW50cy5ib3JkZXJXaWR0aCk7XHJcblx0XHRcdGN0eC5zZXRTdHJva2VTdHlsZSh2bS5ib3JkZXJDb2xvciB8fCBnbG9iYWxEZWZhdWx0cy5kZWZhdWx0Q29sb3IpO1xyXG5cclxuXHRcdFx0Ly8gU3Ryb2tlIExpbmVcclxuXHRcdFx0Y3R4LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRsYXN0RHJhd25JbmRleCA9IC0xO1xyXG5cclxuXHRcdFx0Zm9yIChpbmRleCA9IDA7IGluZGV4IDwgcG9pbnRzLmxlbmd0aDsgKytpbmRleCkge1xyXG5cdFx0XHRcdGN1cnJlbnQgPSBwb2ludHNbaW5kZXhdO1xyXG5cdFx0XHRcdHByZXZpb3VzID0gaGVscGVycy5wcmV2aW91c0l0ZW0ocG9pbnRzLCBpbmRleCk7XHJcblx0XHRcdFx0Y3VycmVudFZNID0gY3VycmVudC5fdmlldztcclxuXHJcblx0XHRcdFx0Ly8gRmlyc3QgcG9pbnQgbW92ZXMgdG8gaXQncyBzdGFydGluZyBwb3NpdGlvbiBubyBtYXR0ZXIgd2hhdFxyXG5cdFx0XHRcdGlmIChpbmRleCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0aWYgKCFjdXJyZW50Vk0uc2tpcCkge1xyXG5cdFx0XHRcdFx0XHRjdHgubW92ZVRvKGN1cnJlbnRWTS54LCBjdXJyZW50Vk0ueSk7XHJcblx0XHRcdFx0XHRcdGxhc3REcmF3bkluZGV4ID0gaW5kZXg7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHByZXZpb3VzID0gbGFzdERyYXduSW5kZXggPT09IC0xID8gcHJldmlvdXMgOiBwb2ludHNbbGFzdERyYXduSW5kZXhdO1xyXG5cclxuXHRcdFx0XHRcdGlmICghY3VycmVudFZNLnNraXApIHtcclxuXHRcdFx0XHRcdFx0aWYgKChsYXN0RHJhd25JbmRleCAhPT0gKGluZGV4IC0gMSkgJiYgIXNwYW5HYXBzKSB8fCBsYXN0RHJhd25JbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBUaGVyZSB3YXMgYSBnYXAgYW5kIHRoaXMgaXMgdGhlIGZpcnN0IHBvaW50IGFmdGVyIHRoZSBnYXBcclxuXHRcdFx0XHRcdFx0XHRjdHgubW92ZVRvKGN1cnJlbnRWTS54LCBjdXJyZW50Vk0ueSk7XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gTGluZSB0byBuZXh0IHBvaW50XHJcblx0XHRcdFx0XHRcdFx0bGluZVRvUG9pbnQocHJldmlvdXMsIGN1cnJlbnQpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGxhc3REcmF3bkluZGV4ID0gaW5kZXg7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjdHguc3Ryb2tlKCk7XHJcblx0XHRcdGN0eC5yZXN0b3JlKCk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcbiJdfQ==