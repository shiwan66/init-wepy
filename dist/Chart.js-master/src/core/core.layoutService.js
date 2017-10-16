'use strict';

module.exports = function (Chart) {

	var helpers = Chart.helpers;

	// The layout service is very self explanatory.  It's responsible for the layout within a chart.
	// Scales, Legends and Plugins all rely on the layout service and can easily register to be placed anywhere they need
	// It is this service's responsibility of carrying out that layout.
	Chart.layoutService = {
		defaults: {},

		// Register a box to a chartInstance. A box is simply a reference to an object that requires layout. eg. Scales, Legend, Plugins.
		addBox: function addBox(chartInstance, box) {
			if (!chartInstance.boxes) {
				chartInstance.boxes = [];
			}
			chartInstance.boxes.push(box);
		},

		removeBox: function removeBox(chartInstance, box) {
			if (!chartInstance.boxes) {
				return;
			}
			chartInstance.boxes.splice(chartInstance.boxes.indexOf(box), 1);
		},

		// The most important function
		update: function update(chartInstance, width, height) {

			if (!chartInstance) {
				return;
			}

			var layoutOptions = chartInstance.options.layout;
			var padding = layoutOptions ? layoutOptions.padding : null;

			var leftPadding = 0;
			var rightPadding = 0;
			var topPadding = 0;
			var bottomPadding = 0;

			if (!isNaN(padding)) {
				// options.layout.padding is a number. assign to all
				leftPadding = padding;
				rightPadding = padding;
				topPadding = padding;
				bottomPadding = padding;
			} else {
				leftPadding = padding.left || 0;
				rightPadding = padding.right || 0;
				topPadding = padding.top || 0;
				bottomPadding = padding.bottom || 0;
			}

			var leftBoxes = helpers.where(chartInstance.boxes, function (box) {
				return box.options.position === 'left';
			});
			var rightBoxes = helpers.where(chartInstance.boxes, function (box) {
				return box.options.position === 'right';
			});
			var topBoxes = helpers.where(chartInstance.boxes, function (box) {
				return box.options.position === 'top';
			});
			var bottomBoxes = helpers.where(chartInstance.boxes, function (box) {
				return box.options.position === 'bottom';
			});

			// Boxes that overlay the chartarea such as the radialLinear scale
			var chartAreaBoxes = helpers.where(chartInstance.boxes, function (box) {
				return box.options.position === 'chartArea';
			});

			// Ensure that full width boxes are at the very top / bottom
			topBoxes.sort(function (a, b) {
				return (b.options.fullWidth ? 1 : 0) - (a.options.fullWidth ? 1 : 0);
			});
			bottomBoxes.sort(function (a, b) {
				return (a.options.fullWidth ? 1 : 0) - (b.options.fullWidth ? 1 : 0);
			});

			// Essentially we now have any number of boxes on each of the 4 sides.
			// Our canvas looks like the following.
			// The areas L1 and L2 are the left axes. R1 is the right axis, T1 is the top axis and
			// B1 is the bottom axis
			// There are also 4 quadrant-like locations (left to right instead of clockwise) reserved for chart overlays
			// These locations are single-box locations only, when trying to register a chartArea location that is already taken,
			// an error will be thrown.
			//
			// |----------------------------------------------------|
			// |                  T1 (Full Width)                   |
			// |----------------------------------------------------|
			// |    |    |                 T2                  |    |
			// |    |----|-------------------------------------|----|
			// |    |    | C1 |                           | C2 |    |
			// |    |    |----|                           |----|    |
			// |    |    |                                     |    |
			// | L1 | L2 |           ChartArea (C0)            | R1 |
			// |    |    |                                     |    |
			// |    |    |----|                           |----|    |
			// |    |    | C3 |                           | C4 |    |
			// |    |----|-------------------------------------|----|
			// |    |    |                 B1                  |    |
			// |----------------------------------------------------|
			// |                  B2 (Full Width)                   |
			// |----------------------------------------------------|
			//
			// What we do to find the best sizing, we do the following
			// 1. Determine the minimum size of the chart area.
			// 2. Split the remaining width equally between each vertical axis
			// 3. Split the remaining height equally between each horizontal axis
			// 4. Give each layout the maximum size it can be. The layout will return it's minimum size
			// 5. Adjust the sizes of each axis based on it's minimum reported size.
			// 6. Refit each axis
			// 7. Position each axis in the final location
			// 8. Tell the chart the final location of the chart area
			// 9. Tell any axes that overlay the chart area the positions of the chart area

			// Step 1
			var chartWidth = width - leftPadding - rightPadding;
			var chartHeight = height - topPadding - bottomPadding;
			var chartAreaWidth = chartWidth / 2; // min 50%
			var chartAreaHeight = chartHeight / 2; // min 50%

			// Step 2
			var verticalBoxWidth = (width - chartAreaWidth) / (leftBoxes.length + rightBoxes.length);

			// Step 3
			var horizontalBoxHeight = (height - chartAreaHeight) / (topBoxes.length + bottomBoxes.length);

			// Step 4
			var maxChartAreaWidth = chartWidth;
			var maxChartAreaHeight = chartHeight;
			var minBoxSizes = [];

			function getMinimumBoxSize(box) {
				var minSize;
				var isHorizontal = box.isHorizontal();

				if (isHorizontal) {
					minSize = box.update(box.options.fullWidth ? chartWidth : maxChartAreaWidth, horizontalBoxHeight);
					maxChartAreaHeight -= minSize.height;
				} else {
					minSize = box.update(verticalBoxWidth, chartAreaHeight);
					maxChartAreaWidth -= minSize.width;
				}

				minBoxSizes.push({
					horizontal: isHorizontal,
					minSize: minSize,
					box: box
				});
			}

			helpers.each(leftBoxes.concat(rightBoxes, topBoxes, bottomBoxes), getMinimumBoxSize);

			// At this point, maxChartAreaHeight and maxChartAreaWidth are the size the chart area could
			// be if the axes are drawn at their minimum sizes.

			// Steps 5 & 6
			var totalLeftBoxesWidth = leftPadding;
			var totalRightBoxesWidth = rightPadding;
			var totalTopBoxesHeight = topPadding;
			var totalBottomBoxesHeight = bottomPadding;

			// Function to fit a box
			function fitBox(box) {
				var minBoxSize = helpers.findNextWhere(minBoxSizes, function (minBox) {
					return minBox.box === box;
				});

				if (minBoxSize) {
					if (box.isHorizontal()) {
						var scaleMargin = {
							left: totalLeftBoxesWidth,
							right: totalRightBoxesWidth,
							top: 0,
							bottom: 0
						};

						// Don't use min size here because of label rotation. When the labels are rotated, their rotation highly depends
						// on the margin. Sometimes they need to increase in size slightly
						box.update(box.options.fullWidth ? chartWidth : maxChartAreaWidth, chartHeight / 2, scaleMargin);
					} else {
						box.update(minBoxSize.minSize.width, maxChartAreaHeight);
					}
				}
			}

			// Update, and calculate the left and right margins for the horizontal boxes
			helpers.each(leftBoxes.concat(rightBoxes), fitBox);

			helpers.each(leftBoxes, function (box) {
				totalLeftBoxesWidth += box.width;
			});

			helpers.each(rightBoxes, function (box) {
				totalRightBoxesWidth += box.width;
			});

			// Set the Left and Right margins for the horizontal boxes
			helpers.each(topBoxes.concat(bottomBoxes), fitBox);

			// Figure out how much margin is on the top and bottom of the vertical boxes
			helpers.each(topBoxes, function (box) {
				totalTopBoxesHeight += box.height;
			});

			helpers.each(bottomBoxes, function (box) {
				totalBottomBoxesHeight += box.height;
			});

			function finalFitVerticalBox(box) {
				var minBoxSize = helpers.findNextWhere(minBoxSizes, function (minSize) {
					return minSize.box === box;
				});

				var scaleMargin = {
					left: 0,
					right: 0,
					top: totalTopBoxesHeight,
					bottom: totalBottomBoxesHeight
				};

				if (minBoxSize) {
					box.update(minBoxSize.minSize.width, maxChartAreaHeight, scaleMargin);
				}
			}

			// Let the left layout know the final margin
			helpers.each(leftBoxes.concat(rightBoxes), finalFitVerticalBox);

			// Recalculate because the size of each layout might have changed slightly due to the margins (label rotation for instance)
			totalLeftBoxesWidth = leftPadding;
			totalRightBoxesWidth = rightPadding;
			totalTopBoxesHeight = topPadding;
			totalBottomBoxesHeight = bottomPadding;

			helpers.each(leftBoxes, function (box) {
				totalLeftBoxesWidth += box.width;
			});

			helpers.each(rightBoxes, function (box) {
				totalRightBoxesWidth += box.width;
			});

			helpers.each(topBoxes, function (box) {
				totalTopBoxesHeight += box.height;
			});
			helpers.each(bottomBoxes, function (box) {
				totalBottomBoxesHeight += box.height;
			});

			// Figure out if our chart area changed. This would occur if the dataset layout label rotation
			// changed due to the application of the margins in step 6. Since we can only get bigger, this is safe to do
			// without calling `fit` again
			var newMaxChartAreaHeight = height - totalTopBoxesHeight - totalBottomBoxesHeight;
			var newMaxChartAreaWidth = width - totalLeftBoxesWidth - totalRightBoxesWidth;

			if (newMaxChartAreaWidth !== maxChartAreaWidth || newMaxChartAreaHeight !== maxChartAreaHeight) {
				helpers.each(leftBoxes, function (box) {
					box.height = newMaxChartAreaHeight;
				});

				helpers.each(rightBoxes, function (box) {
					box.height = newMaxChartAreaHeight;
				});

				helpers.each(topBoxes, function (box) {
					if (!box.options.fullWidth) {
						box.width = newMaxChartAreaWidth;
					}
				});

				helpers.each(bottomBoxes, function (box) {
					if (!box.options.fullWidth) {
						box.width = newMaxChartAreaWidth;
					}
				});

				maxChartAreaHeight = newMaxChartAreaHeight;
				maxChartAreaWidth = newMaxChartAreaWidth;
			}

			// Step 7 - Position the boxes
			var left = leftPadding;
			var top = topPadding;

			function placeBox(box) {
				if (box.isHorizontal()) {
					box.left = box.options.fullWidth ? leftPadding : totalLeftBoxesWidth;
					box.right = box.options.fullWidth ? width - rightPadding : totalLeftBoxesWidth + maxChartAreaWidth;
					box.top = top;
					box.bottom = top + box.height;

					// Move to next point
					top = box.bottom;
				} else {

					box.left = left;
					box.right = left + box.width;
					box.top = totalTopBoxesHeight;
					box.bottom = totalTopBoxesHeight + maxChartAreaHeight;

					// Move to next point
					left = box.right;
				}
			}

			helpers.each(leftBoxes.concat(topBoxes), placeBox);

			// Account for chart width and height
			left += maxChartAreaWidth;
			top += maxChartAreaHeight;

			helpers.each(rightBoxes, placeBox);
			helpers.each(bottomBoxes, placeBox);

			// Step 8
			chartInstance.chartArea = {
				left: totalLeftBoxesWidth,
				top: totalTopBoxesHeight,
				right: totalLeftBoxesWidth + maxChartAreaWidth,
				bottom: totalTopBoxesHeight + maxChartAreaHeight
			};

			// Step 9
			helpers.each(chartAreaBoxes, function (box) {
				box.left = chartInstance.chartArea.left;
				box.top = chartInstance.chartArea.top;
				box.right = chartInstance.chartArea.right;
				box.bottom = chartInstance.chartArea.bottom;

				box.update(maxChartAreaWidth, maxChartAreaHeight);
			});
		}
	};
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUubGF5b3V0U2VydmljZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwiQ2hhcnQiLCJoZWxwZXJzIiwibGF5b3V0U2VydmljZSIsImRlZmF1bHRzIiwiYWRkQm94IiwiY2hhcnRJbnN0YW5jZSIsImJveCIsImJveGVzIiwicHVzaCIsInJlbW92ZUJveCIsInNwbGljZSIsImluZGV4T2YiLCJ1cGRhdGUiLCJ3aWR0aCIsImhlaWdodCIsImxheW91dE9wdGlvbnMiLCJvcHRpb25zIiwibGF5b3V0IiwicGFkZGluZyIsImxlZnRQYWRkaW5nIiwicmlnaHRQYWRkaW5nIiwidG9wUGFkZGluZyIsImJvdHRvbVBhZGRpbmciLCJpc05hTiIsImxlZnQiLCJyaWdodCIsInRvcCIsImJvdHRvbSIsImxlZnRCb3hlcyIsIndoZXJlIiwicG9zaXRpb24iLCJyaWdodEJveGVzIiwidG9wQm94ZXMiLCJib3R0b21Cb3hlcyIsImNoYXJ0QXJlYUJveGVzIiwic29ydCIsImEiLCJiIiwiZnVsbFdpZHRoIiwiY2hhcnRXaWR0aCIsImNoYXJ0SGVpZ2h0IiwiY2hhcnRBcmVhV2lkdGgiLCJjaGFydEFyZWFIZWlnaHQiLCJ2ZXJ0aWNhbEJveFdpZHRoIiwibGVuZ3RoIiwiaG9yaXpvbnRhbEJveEhlaWdodCIsIm1heENoYXJ0QXJlYVdpZHRoIiwibWF4Q2hhcnRBcmVhSGVpZ2h0IiwibWluQm94U2l6ZXMiLCJnZXRNaW5pbXVtQm94U2l6ZSIsIm1pblNpemUiLCJpc0hvcml6b250YWwiLCJob3Jpem9udGFsIiwiZWFjaCIsImNvbmNhdCIsInRvdGFsTGVmdEJveGVzV2lkdGgiLCJ0b3RhbFJpZ2h0Qm94ZXNXaWR0aCIsInRvdGFsVG9wQm94ZXNIZWlnaHQiLCJ0b3RhbEJvdHRvbUJveGVzSGVpZ2h0IiwiZml0Qm94IiwibWluQm94U2l6ZSIsImZpbmROZXh0V2hlcmUiLCJtaW5Cb3giLCJzY2FsZU1hcmdpbiIsImZpbmFsRml0VmVydGljYWxCb3giLCJuZXdNYXhDaGFydEFyZWFIZWlnaHQiLCJuZXdNYXhDaGFydEFyZWFXaWR0aCIsInBsYWNlQm94IiwiY2hhcnRBcmVhIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQUEsT0FBT0MsT0FBUCxHQUFpQixVQUFTQyxLQUFULEVBQWdCOztBQUVoQyxLQUFJQyxVQUFVRCxNQUFNQyxPQUFwQjs7QUFFQTtBQUNBO0FBQ0E7QUFDQUQsT0FBTUUsYUFBTixHQUFzQjtBQUNyQkMsWUFBVSxFQURXOztBQUdyQjtBQUNBQyxVQUFRLGdCQUFTQyxhQUFULEVBQXdCQyxHQUF4QixFQUE2QjtBQUNwQyxPQUFJLENBQUNELGNBQWNFLEtBQW5CLEVBQTBCO0FBQ3pCRixrQkFBY0UsS0FBZCxHQUFzQixFQUF0QjtBQUNBO0FBQ0RGLGlCQUFjRSxLQUFkLENBQW9CQyxJQUFwQixDQUF5QkYsR0FBekI7QUFDQSxHQVRvQjs7QUFXckJHLGFBQVcsbUJBQVNKLGFBQVQsRUFBd0JDLEdBQXhCLEVBQTZCO0FBQ3ZDLE9BQUksQ0FBQ0QsY0FBY0UsS0FBbkIsRUFBMEI7QUFDekI7QUFDQTtBQUNERixpQkFBY0UsS0FBZCxDQUFvQkcsTUFBcEIsQ0FBMkJMLGNBQWNFLEtBQWQsQ0FBb0JJLE9BQXBCLENBQTRCTCxHQUE1QixDQUEzQixFQUE2RCxDQUE3RDtBQUNBLEdBaEJvQjs7QUFrQnJCO0FBQ0FNLFVBQVEsZ0JBQVNQLGFBQVQsRUFBd0JRLEtBQXhCLEVBQStCQyxNQUEvQixFQUF1Qzs7QUFFOUMsT0FBSSxDQUFDVCxhQUFMLEVBQW9CO0FBQ25CO0FBQ0E7O0FBRUQsT0FBSVUsZ0JBQWdCVixjQUFjVyxPQUFkLENBQXNCQyxNQUExQztBQUNBLE9BQUlDLFVBQVVILGdCQUFnQkEsY0FBY0csT0FBOUIsR0FBd0MsSUFBdEQ7O0FBRUEsT0FBSUMsY0FBYyxDQUFsQjtBQUNBLE9BQUlDLGVBQWUsQ0FBbkI7QUFDQSxPQUFJQyxhQUFhLENBQWpCO0FBQ0EsT0FBSUMsZ0JBQWdCLENBQXBCOztBQUVBLE9BQUksQ0FBQ0MsTUFBTUwsT0FBTixDQUFM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R0FBV25CLGNBQWMrRCxTQUFkLENBQXdCNUMsSUFBbkM7QUFDQWxCLFFBQUlvQixHQUFKLEdBQVVyQixjQUFjK0QsU0FBZCxDQUF3QjFDLEdBQWxDO0FBQ0FwQixRQUFJbUIsS0FBSixHQUFZcEIsY0FBYytELFNBQWQsQ0FBd0IzQyxLQUFwQztBQUNBbkIsUUFBSXFCLE1BQUosR0FBYXRCLGNBQWMrRCxTQUFkLENBQXdCekMsTUFBckM7O0FBRUFyQixRQUFJTSxNQUFKLENBQVdrQyxpQkFBWCxFQUE4QkMsa0JBQTlCO0FBQ0EsSUFQRDtBQVFBO0FBdlVvQixFQUF0QjtBQXlVQSxDQWhWRCIsImZpbGUiOiJjb3JlLmxheW91dFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKENoYXJ0KSB7XHJcblxyXG5cdHZhciBoZWxwZXJzID0gQ2hhcnQuaGVscGVycztcclxuXHJcblx0Ly8gVGhlIGxheW91dCBzZXJ2aWNlIGlzIHZlcnkgc2VsZiBleHBsYW5hdG9yeS4gIEl0J3MgcmVzcG9uc2libGUgZm9yIHRoZSBsYXlvdXQgd2l0aGluIGEgY2hhcnQuXHJcblx0Ly8gU2NhbGVzLCBMZWdlbmRzIGFuZCBQbHVnaW5zIGFsbCByZWx5IG9uIHRoZSBsYXlvdXQgc2VydmljZSBhbmQgY2FuIGVhc2lseSByZWdpc3RlciB0byBiZSBwbGFjZWQgYW55d2hlcmUgdGhleSBuZWVkXHJcblx0Ly8gSXQgaXMgdGhpcyBzZXJ2aWNlJ3MgcmVzcG9uc2liaWxpdHkgb2YgY2Fycnlpbmcgb3V0IHRoYXQgbGF5b3V0LlxyXG5cdENoYXJ0LmxheW91dFNlcnZpY2UgPSB7XHJcblx0XHRkZWZhdWx0czoge30sXHJcblxyXG5cdFx0Ly8gUmVnaXN0ZXIgYSBib3ggdG8gYSBjaGFydEluc3RhbmNlLiBBIGJveCBpcyBzaW1wbHkgYSByZWZlcmVuY2UgdG8gYW4gb2JqZWN0IHRoYXQgcmVxdWlyZXMgbGF5b3V0LiBlZy4gU2NhbGVzLCBMZWdlbmQsIFBsdWdpbnMuXHJcblx0XHRhZGRCb3g6IGZ1bmN0aW9uKGNoYXJ0SW5zdGFuY2UsIGJveCkge1xyXG5cdFx0XHRpZiAoIWNoYXJ0SW5zdGFuY2UuYm94ZXMpIHtcclxuXHRcdFx0XHRjaGFydEluc3RhbmNlLmJveGVzID0gW107XHJcblx0XHRcdH1cclxuXHRcdFx0Y2hhcnRJbnN0YW5jZS5ib3hlcy5wdXNoKGJveCk7XHJcblx0XHR9LFxyXG5cclxuXHRcdHJlbW92ZUJveDogZnVuY3Rpb24oY2hhcnRJbnN0YW5jZSwgYm94KSB7XHJcblx0XHRcdGlmICghY2hhcnRJbnN0YW5jZS5ib3hlcykge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0XHRjaGFydEluc3RhbmNlLmJveGVzLnNwbGljZShjaGFydEluc3RhbmNlLmJveGVzLmluZGV4T2YoYm94KSwgMSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIFRoZSBtb3N0IGltcG9ydGFudCBmdW5jdGlvblxyXG5cdFx0dXBkYXRlOiBmdW5jdGlvbihjaGFydEluc3RhbmNlLCB3aWR0aCwgaGVpZ2h0KSB7XHJcblxyXG5cdFx0XHRpZiAoIWNoYXJ0SW5zdGFuY2UpIHtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBsYXlvdXRPcHRpb25zID0gY2hhcnRJbnN0YW5jZS5vcHRpb25zLmxheW91dDtcclxuXHRcdFx0dmFyIHBhZGRpbmcgPSBsYXlvdXRPcHRpb25zID8gbGF5b3V0T3B0aW9ucy5wYWRkaW5nIDogbnVsbDtcclxuXHJcblx0XHRcdHZhciBsZWZ0UGFkZGluZyA9IDA7XHJcblx0XHRcdHZhciByaWdodFBhZGRpbmcgPSAwO1xyXG5cdFx0XHR2YXIgdG9wUGFkZGluZyA9IDA7XHJcblx0XHRcdHZhciBib3R0b21QYWRkaW5nID0gMDtcclxuXHJcblx0XHRcdGlmICghaXNOYU4ocGFkZGluZykpIHtcclxuXHRcdFx0XHQvLyBvcHRpb25zLmxheW91dC5wYWRkaW5nIGlzIGEgbnVtYmVyLiBhc3NpZ24gdG8gYWxsXHJcblx0XHRcdFx0bGVmdFBhZGRpbmcgPSBwYWRkaW5nO1xyXG5cdFx0XHRcdHJpZ2h0UGFkZGluZyA9IHBhZGRpbmc7XHJcblx0XHRcdFx0dG9wUGFkZGluZyA9IHBhZGRpbmc7XHJcblx0XHRcdFx0Ym90dG9tUGFkZGluZyA9IHBhZGRpbmc7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0bGVmdFBhZGRpbmcgPSBwYWRkaW5nLmxlZnQgfHwgMDtcclxuXHRcdFx0XHRyaWdodFBhZGRpbmcgPSBwYWRkaW5nLnJpZ2h0IHx8IDA7XHJcblx0XHRcdFx0dG9wUGFkZGluZyA9IHBhZGRpbmcudG9wIHx8IDA7XHJcblx0XHRcdFx0Ym90dG9tUGFkZGluZyA9IHBhZGRpbmcuYm90dG9tIHx8IDA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBsZWZ0Qm94ZXMgPSBoZWxwZXJzLndoZXJlKGNoYXJ0SW5zdGFuY2UuYm94ZXMsIGZ1bmN0aW9uKGJveCkge1xyXG5cdFx0XHRcdHJldHVybiBib3gub3B0aW9ucy5wb3NpdGlvbiA9PT0gJ2xlZnQnO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0dmFyIHJpZ2h0Qm94ZXMgPSBoZWxwZXJzLndoZXJlKGNoYXJ0SW5zdGFuY2UuYm94ZXMsIGZ1bmN0aW9uKGJveCkge1xyXG5cdFx0XHRcdHJldHVybiBib3gub3B0aW9ucy5wb3NpdGlvbiA9PT0gJ3JpZ2h0JztcclxuXHRcdFx0fSk7XHJcblx0XHRcdHZhciB0b3BCb3hlcyA9IGhlbHBlcnMud2hlcmUoY2hhcnRJbnN0YW5jZS5ib3hlcywgZnVuY3Rpb24oYm94KSB7XHJcblx0XHRcdFx0cmV0dXJuIGJveC5vcHRpb25zLnBvc2l0aW9uID09PSAndG9wJztcclxuXHRcdFx0fSk7XHJcblx0XHRcdHZhciBib3R0b21Cb3hlcyA9IGhlbHBlcnMud2hlcmUoY2hhcnRJbnN0YW5jZS5ib3hlcywgZnVuY3Rpb24oYm94KSB7XHJcblx0XHRcdFx0cmV0dXJuIGJveC5vcHRpb25zLnBvc2l0aW9uID09PSAnYm90dG9tJztcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBCb3hlcyB0aGF0IG92ZXJsYXkgdGhlIGNoYXJ0YXJlYSBzdWNoIGFzIHRoZSByYWRpYWxMaW5lYXIgc2NhbGVcclxuXHRcdFx0dmFyIGNoYXJ0QXJlYUJveGVzID0gaGVscGVycy53aGVyZShjaGFydEluc3RhbmNlLmJveGVzLCBmdW5jdGlvbihib3gpIHtcclxuXHRcdFx0XHRyZXR1cm4gYm94Lm9wdGlvbnMucG9zaXRpb24gPT09ICdjaGFydEFyZWEnO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEVuc3VyZSB0aGF0IGZ1bGwgd2lkdGggYm94ZXMgYXJlIGF0IHRoZSB2ZXJ5IHRvcCAvIGJvdHRvbVxyXG5cdFx0XHR0b3BCb3hlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcclxuXHRcdFx0XHRyZXR1cm4gKGIub3B0aW9ucy5mdWxsV2lkdGggPyAxIDogMCkgLSAoYS5vcHRpb25zLmZ1bGxXaWR0aCA/IDEgOiAwKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdGJvdHRvbUJveGVzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xyXG5cdFx0XHRcdHJldHVybiAoYS5vcHRpb25zLmZ1bGxXaWR0aCA/IDEgOiAwKSAtIChiLm9wdGlvbnMuZnVsbFdpZHRoID8gMSA6IDApO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEVzc2VudGlhbGx5IHdlIG5vdyBoYXZlIGFueSBudW1iZXIgb2YgYm94ZXMgb24gZWFjaCBvZiB0aGUgNCBzaWRlcy5cclxuXHRcdFx0Ly8gT3VyIGNhbnZhcyBsb29rcyBsaWtlIHRoZSBmb2xsb3dpbmcuXHJcblx0XHRcdC8vIFRoZSBhcmVhcyBMMSBhbmQgTDIgYXJlIHRoZSBsZWZ0IGF4ZXMuIFIxIGlzIHRoZSByaWdodCBheGlzLCBUMSBpcyB0aGUgdG9wIGF4aXMgYW5kXHJcblx0XHRcdC8vIEIxIGlzIHRoZSBib3R0b20gYXhpc1xyXG5cdFx0XHQvLyBUaGVyZSBhcmUgYWxzbyA0IHF1YWRyYW50LWxpa2UgbG9jYXRpb25zIChsZWZ0IHRvIHJpZ2h0IGluc3RlYWQgb2YgY2xvY2t3aXNlKSByZXNlcnZlZCBmb3IgY2hhcnQgb3ZlcmxheXNcclxuXHRcdFx0Ly8gVGhlc2UgbG9jYXRpb25zIGFyZSBzaW5nbGUtYm94IGxvY2F0aW9ucyBvbmx5LCB3aGVuIHRyeWluZyB0byByZWdpc3RlciBhIGNoYXJ0QXJlYSBsb2NhdGlvbiB0aGF0IGlzIGFscmVhZHkgdGFrZW4sXHJcblx0XHRcdC8vIGFuIGVycm9yIHdpbGwgYmUgdGhyb3duLlxyXG5cdFx0XHQvL1xyXG5cdFx0XHQvLyB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLXxcclxuXHRcdFx0Ly8gfCAgICAgICAgICAgICAgICAgIFQxIChGdWxsIFdpZHRoKSAgICAgICAgICAgICAgICAgICB8XHJcblx0XHRcdC8vIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxyXG5cdFx0XHQvLyB8ICAgIHwgICAgfCAgICAgICAgICAgICAgICAgVDIgICAgICAgICAgICAgICAgICB8ICAgIHxcclxuXHRcdFx0Ly8gfCAgICB8LS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS18XHJcblx0XHRcdC8vIHwgICAgfCAgICB8IEMxIHwgICAgICAgICAgICAgICAgICAgICAgICAgICB8IEMyIHwgICAgfFxyXG5cdFx0XHQvLyB8ICAgIHwgICAgfC0tLS18ICAgICAgICAgICAgICAgICAgICAgICAgICAgfC0tLS18ICAgIHxcclxuXHRcdFx0Ly8gfCAgICB8ICAgIHwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAgICB8XHJcblx0XHRcdC8vIHwgTDEgfCBMMiB8ICAgICAgICAgICBDaGFydEFyZWEgKEMwKSAgICAgICAgICAgIHwgUjEgfFxyXG5cdFx0XHQvLyB8ICAgIHwgICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8ICAgIHxcclxuXHRcdFx0Ly8gfCAgICB8ICAgIHwtLS0tfCAgICAgICAgICAgICAgICAgICAgICAgICAgIHwtLS0tfCAgICB8XHJcblx0XHRcdC8vIHwgICAgfCAgICB8IEMzIHwgICAgICAgICAgICAgICAgICAgICAgICAgICB8IEM0IHwgICAgfFxyXG5cdFx0XHQvLyB8ICAgIHwtLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLXxcclxuXHRcdFx0Ly8gfCAgICB8ICAgIHwgICAgICAgICAgICAgICAgIEIxICAgICAgICAgICAgICAgICAgfCAgICB8XHJcblx0XHRcdC8vIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxyXG5cdFx0XHQvLyB8ICAgICAgICAgICAgICAgICAgQjIgKEZ1bGwgV2lkdGgpICAgICAgICAgICAgICAgICAgIHxcclxuXHRcdFx0Ly8gfC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS18XHJcblx0XHRcdC8vXHJcblx0XHRcdC8vIFdoYXQgd2UgZG8gdG8gZmluZCB0aGUgYmVzdCBzaXppbmcsIHdlIGRvIHRoZSBmb2xsb3dpbmdcclxuXHRcdFx0Ly8gMS4gRGV0ZXJtaW5lIHRoZSBtaW5pbXVtIHNpemUgb2YgdGhlIGNoYXJ0IGFyZWEuXHJcblx0XHRcdC8vIDIuIFNwbGl0IHRoZSByZW1haW5pbmcgd2lkdGggZXF1YWxseSBiZXR3ZWVuIGVhY2ggdmVydGljYWwgYXhpc1xyXG5cdFx0XHQvLyAzLiBTcGxpdCB0aGUgcmVtYWluaW5nIGhlaWdodCBlcXVhbGx5IGJldHdlZW4gZWFjaCBob3Jpem9udGFsIGF4aXNcclxuXHRcdFx0Ly8gNC4gR2l2ZSBlYWNoIGxheW91dCB0aGUgbWF4aW11bSBzaXplIGl0IGNhbiBiZS4gVGhlIGxheW91dCB3aWxsIHJldHVybiBpdCdzIG1pbmltdW0gc2l6ZVxyXG5cdFx0XHQvLyA1LiBBZGp1c3QgdGhlIHNpemVzIG9mIGVhY2ggYXhpcyBiYXNlZCBvbiBpdCdzIG1pbmltdW0gcmVwb3J0ZWQgc2l6ZS5cclxuXHRcdFx0Ly8gNi4gUmVmaXQgZWFjaCBheGlzXHJcblx0XHRcdC8vIDcuIFBvc2l0aW9uIGVhY2ggYXhpcyBpbiB0aGUgZmluYWwgbG9jYXRpb25cclxuXHRcdFx0Ly8gOC4gVGVsbCB0aGUgY2hhcnQgdGhlIGZpbmFsIGxvY2F0aW9uIG9mIHRoZSBjaGFydCBhcmVhXHJcblx0XHRcdC8vIDkuIFRlbGwgYW55IGF4ZXMgdGhhdCBvdmVybGF5IHRoZSBjaGFydCBhcmVhIHRoZSBwb3NpdGlvbnMgb2YgdGhlIGNoYXJ0IGFyZWFcclxuXHJcblx0XHRcdC8vIFN0ZXAgMVxyXG5cdFx0XHR2YXIgY2hhcnRXaWR0aCA9IHdpZHRoIC0gbGVmdFBhZGRpbmcgLSByaWdodFBhZGRpbmc7XHJcblx0XHRcdHZhciBjaGFydEhlaWdodCA9IGhlaWdodCAtIHRvcFBhZGRpbmcgLSBib3R0b21QYWRkaW5nO1xyXG5cdFx0XHR2YXIgY2hhcnRBcmVhV2lkdGggPSBjaGFydFdpZHRoIC8gMjsgLy8gbWluIDUwJVxyXG5cdFx0XHR2YXIgY2hhcnRBcmVhSGVpZ2h0ID0gY2hhcnRIZWlnaHQgLyAyOyAvLyBtaW4gNTAlXHJcblxyXG5cdFx0XHQvLyBTdGVwIDJcclxuXHRcdFx0dmFyIHZlcnRpY2FsQm94V2lkdGggPSAod2lkdGggLSBjaGFydEFyZWFXaWR0aCkgLyAobGVmdEJveGVzLmxlbmd0aCArIHJpZ2h0Qm94ZXMubGVuZ3RoKTtcclxuXHJcblx0XHRcdC8vIFN0ZXAgM1xyXG5cdFx0XHR2YXIgaG9yaXpvbnRhbEJveEhlaWdodCA9IChoZWlnaHQgLSBjaGFydEFyZWFIZWlnaHQpIC8gKHRvcEJveGVzLmxlbmd0aCArIGJvdHRvbUJveGVzLmxlbmd0aCk7XHJcblxyXG5cdFx0XHQvLyBTdGVwIDRcclxuXHRcdFx0dmFyIG1heENoYXJ0QXJlYVdpZHRoID0gY2hhcnRXaWR0aDtcclxuXHRcdFx0dmFyIG1heENoYXJ0QXJlYUhlaWdodCA9IGNoYXJ0SGVpZ2h0O1xyXG5cdFx0XHR2YXIgbWluQm94U2l6ZXMgPSBbXTtcclxuXHJcblx0XHRcdGZ1bmN0aW9uIGdldE1pbmltdW1Cb3hTaXplKGJveCkge1xyXG5cdFx0XHRcdHZhciBtaW5TaXplO1xyXG5cdFx0XHRcdHZhciBpc0hvcml6b250YWwgPSBib3guaXNIb3Jpem9udGFsKCk7XHJcblxyXG5cdFx0XHRcdGlmIChpc0hvcml6b250YWwpIHtcclxuXHRcdFx0XHRcdG1pblNpemUgPSBib3gudXBkYXRlKGJveC5vcHRpb25zLmZ1bGxXaWR0aCA/IGNoYXJ0V2lkdGggOiBtYXhDaGFydEFyZWFXaWR0aCwgaG9yaXpvbnRhbEJveEhlaWdodCk7XHJcblx0XHRcdFx0XHRtYXhDaGFydEFyZWFIZWlnaHQgLT0gbWluU2l6ZS5oZWlnaHQ7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdG1pblNpemUgPSBib3gudXBkYXRlKHZlcnRpY2FsQm94V2lkdGgsIGNoYXJ0QXJlYUhlaWdodCk7XHJcblx0XHRcdFx0XHRtYXhDaGFydEFyZWFXaWR0aCAtPSBtaW5TaXplLndpZHRoO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0bWluQm94U2l6ZXMucHVzaCh7XHJcblx0XHRcdFx0XHRob3Jpem9udGFsOiBpc0hvcml6b250YWwsXHJcblx0XHRcdFx0XHRtaW5TaXplOiBtaW5TaXplLFxyXG5cdFx0XHRcdFx0Ym94OiBib3hcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aGVscGVycy5lYWNoKGxlZnRCb3hlcy5jb25jYXQocmlnaHRCb3hlcywgdG9wQm94ZXMsIGJvdHRvbUJveGVzKSwgZ2V0TWluaW11bUJveFNpemUpO1xyXG5cclxuXHRcdFx0Ly8gQXQgdGhpcyBwb2ludCwgbWF4Q2hhcnRBcmVhSGVpZ2h0IGFuZCBtYXhDaGFydEFyZWFXaWR0aCBhcmUgdGhlIHNpemUgdGhlIGNoYXJ0IGFyZWEgY291bGRcclxuXHRcdFx0Ly8gYmUgaWYgdGhlIGF4ZXMgYXJlIGRyYXduIGF0IHRoZWlyIG1pbmltdW0gc2l6ZXMuXHJcblxyXG5cdFx0XHQvLyBTdGVwcyA1ICYgNlxyXG5cdFx0XHR2YXIgdG90YWxMZWZ0Qm94ZXNXaWR0aCA9IGxlZnRQYWRkaW5nO1xyXG5cdFx0XHR2YXIgdG90YWxSaWdodEJveGVzV2lkdGggPSByaWdodFBhZGRpbmc7XHJcblx0XHRcdHZhciB0b3RhbFRvcEJveGVzSGVpZ2h0ID0gdG9wUGFkZGluZztcclxuXHRcdFx0dmFyIHRvdGFsQm90dG9tQm94ZXNIZWlnaHQgPSBib3R0b21QYWRkaW5nO1xyXG5cclxuXHRcdFx0Ly8gRnVuY3Rpb24gdG8gZml0IGEgYm94XHJcblx0XHRcdGZ1bmN0aW9uIGZpdEJveChib3gpIHtcclxuXHRcdFx0XHR2YXIgbWluQm94U2l6ZSA9IGhlbHBlcnMuZmluZE5leHRXaGVyZShtaW5Cb3hTaXplcywgZnVuY3Rpb24obWluQm94KSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbWluQm94LmJveCA9PT0gYm94O1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRpZiAobWluQm94U2l6ZSkge1xyXG5cdFx0XHRcdFx0aWYgKGJveC5pc0hvcml6b250YWwoKSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgc2NhbGVNYXJnaW4gPSB7XHJcblx0XHRcdFx0XHRcdFx0bGVmdDogdG90YWxMZWZ0Qm94ZXNXaWR0aCxcclxuXHRcdFx0XHRcdFx0XHRyaWdodDogdG90YWxSaWdodEJveGVzV2lkdGgsXHJcblx0XHRcdFx0XHRcdFx0dG9wOiAwLFxyXG5cdFx0XHRcdFx0XHRcdGJvdHRvbTogMFxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gRG9uJ3QgdXNlIG1pbiBzaXplIGhlcmUgYmVjYXVzZSBvZiBsYWJlbCByb3RhdGlvbi4gV2hlbiB0aGUgbGFiZWxzIGFyZSByb3RhdGVkLCB0aGVpciByb3RhdGlvbiBoaWdobHkgZGVwZW5kc1xyXG5cdFx0XHRcdFx0XHQvLyBvbiB0aGUgbWFyZ2luLiBTb21ldGltZXMgdGhleSBuZWVkIHRvIGluY3JlYXNlIGluIHNpemUgc2xpZ2h0bHlcclxuXHRcdFx0XHRcdFx0Ym94LnVwZGF0ZShib3gub3B0aW9ucy5mdWxsV2lkdGggPyBjaGFydFdpZHRoIDogbWF4Q2hhcnRBcmVhV2lkdGgsIGNoYXJ0SGVpZ2h0IC8gMiwgc2NhbGVNYXJnaW4pO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ym94LnVwZGF0ZShtaW5Cb3hTaXplLm1pblNpemUud2lkdGgsIG1heENoYXJ0QXJlYUhlaWdodCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUsIGFuZCBjYWxjdWxhdGUgdGhlIGxlZnQgYW5kIHJpZ2h0IG1hcmdpbnMgZm9yIHRoZSBob3Jpem9udGFsIGJveGVzXHJcblx0XHRcdGhlbHBlcnMuZWFjaChsZWZ0Qm94ZXMuY29uY2F0KHJpZ2h0Qm94ZXMpLCBmaXRCb3gpO1xyXG5cclxuXHRcdFx0aGVscGVycy5lYWNoKGxlZnRCb3hlcywgZnVuY3Rpb24oYm94KSB7XHJcblx0XHRcdFx0dG90YWxMZWZ0Qm94ZXNXaWR0aCArPSBib3gud2lkdGg7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aGVscGVycy5lYWNoKHJpZ2h0Qm94ZXMsIGZ1bmN0aW9uKGJveCkge1xyXG5cdFx0XHRcdHRvdGFsUmlnaHRCb3hlc1dpZHRoICs9IGJveC53aWR0aDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTZXQgdGhlIExlZnQgYW5kIFJpZ2h0IG1hcmdpbnMgZm9yIHRoZSBob3Jpem9udGFsIGJveGVzXHJcblx0XHRcdGhlbHBlcnMuZWFjaCh0b3BCb3hlcy5jb25jYXQoYm90dG9tQm94ZXMpLCBmaXRCb3gpO1xyXG5cclxuXHRcdFx0Ly8gRmlndXJlIG91dCBob3cgbXVjaCBtYXJnaW4gaXMgb24gdGhlIHRvcCBhbmQgYm90dG9tIG9mIHRoZSB2ZXJ0aWNhbCBib3hlc1xyXG5cdFx0XHRoZWxwZXJzLmVhY2godG9wQm94ZXMsIGZ1bmN0aW9uKGJveCkge1xyXG5cdFx0XHRcdHRvdGFsVG9wQm94ZXNIZWlnaHQgKz0gYm94LmhlaWdodDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRoZWxwZXJzLmVhY2goYm90dG9tQm94ZXMsIGZ1bmN0aW9uKGJveCkge1xyXG5cdFx0XHRcdHRvdGFsQm90dG9tQm94ZXNIZWlnaHQgKz0gYm94LmhlaWdodDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRmdW5jdGlvbiBmaW5hbEZpdFZlcnRpY2FsQm94KGJveCkge1xyXG5cdFx0XHRcdHZhciBtaW5Cb3hTaXplID0gaGVscGVycy5maW5kTmV4dFdoZXJlKG1pbkJveFNpemVzLCBmdW5jdGlvbihtaW5TaXplKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbWluU2l6ZS5ib3ggPT09IGJveDtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dmFyIHNjYWxlTWFyZ2luID0ge1xyXG5cdFx0XHRcdFx0bGVmdDogMCxcclxuXHRcdFx0XHRcdHJpZ2h0OiAwLFxyXG5cdFx0XHRcdFx0dG9wOiB0b3RhbFRvcEJveGVzSGVpZ2h0LFxyXG5cdFx0XHRcdFx0Ym90dG9tOiB0b3RhbEJvdHRvbUJveGVzSGVpZ2h0XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0aWYgKG1pbkJveFNpemUpIHtcclxuXHRcdFx0XHRcdGJveC51cGRhdGUobWluQm94U2l6ZS5taW5TaXplLndpZHRoLCBtYXhDaGFydEFyZWFIZWlnaHQsIHNjYWxlTWFyZ2luKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIExldCB0aGUgbGVmdCBsYXlvdXQga25vdyB0aGUgZmluYWwgbWFyZ2luXHJcblx0XHRcdGhlbHBlcnMuZWFjaChsZWZ0Qm94ZXMuY29uY2F0KHJpZ2h0Qm94ZXMpLCBmaW5hbEZpdFZlcnRpY2FsQm94KTtcclxuXHJcblx0XHRcdC8vIFJlY2FsY3VsYXRlIGJlY2F1c2UgdGhlIHNpemUgb2YgZWFjaCBsYXlvdXQgbWlnaHQgaGF2ZSBjaGFuZ2VkIHNsaWdodGx5IGR1ZSB0byB0aGUgbWFyZ2lucyAobGFiZWwgcm90YXRpb24gZm9yIGluc3RhbmNlKVxyXG5cdFx0XHR0b3RhbExlZnRCb3hlc1dpZHRoID0gbGVmdFBhZGRpbmc7XHJcblx0XHRcdHRvdGFsUmlnaHRCb3hlc1dpZHRoID0gcmlnaHRQYWRkaW5nO1xyXG5cdFx0XHR0b3RhbFRvcEJveGVzSGVpZ2h0ID0gdG9wUGFkZGluZztcclxuXHRcdFx0dG90YWxCb3R0b21Cb3hlc0hlaWdodCA9IGJvdHRvbVBhZGRpbmc7XHJcblxyXG5cdFx0XHRoZWxwZXJzLmVhY2gobGVmdEJveGVzLCBmdW5jdGlvbihib3gpIHtcclxuXHRcdFx0XHR0b3RhbExlZnRCb3hlc1dpZHRoICs9IGJveC53aWR0aDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRoZWxwZXJzLmVhY2gocmlnaHRCb3hlcywgZnVuY3Rpb24oYm94KSB7XHJcblx0XHRcdFx0dG90YWxSaWdodEJveGVzV2lkdGggKz0gYm94LndpZHRoO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGhlbHBlcnMuZWFjaCh0b3BCb3hlcywgZnVuY3Rpb24oYm94KSB7XHJcblx0XHRcdFx0dG90YWxUb3BCb3hlc0hlaWdodCArPSBib3guaGVpZ2h0O1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0aGVscGVycy5lYWNoKGJvdHRvbUJveGVzLCBmdW5jdGlvbihib3gpIHtcclxuXHRcdFx0XHR0b3RhbEJvdHRvbUJveGVzSGVpZ2h0ICs9IGJveC5oZWlnaHQ7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gRmlndXJlIG91dCBpZiBvdXIgY2hhcnQgYXJlYSBjaGFuZ2VkLiBUaGlzIHdvdWxkIG9jY3VyIGlmIHRoZSBkYXRhc2V0IGxheW91dCBsYWJlbCByb3RhdGlvblxyXG5cdFx0XHQvLyBjaGFuZ2VkIGR1ZSB0byB0aGUgYXBwbGljYXRpb24gb2YgdGhlIG1hcmdpbnMgaW4gc3RlcCA2LiBTaW5jZSB3ZSBjYW4gb25seSBnZXQgYmlnZ2VyLCB0aGlzIGlzIHNhZmUgdG8gZG9cclxuXHRcdFx0Ly8gd2l0aG91dCBjYWxsaW5nIGBmaXRgIGFnYWluXHJcblx0XHRcdHZhciBuZXdNYXhDaGFydEFyZWFIZWlnaHQgPSBoZWlnaHQgLSB0b3RhbFRvcEJveGVzSGVpZ2h0IC0gdG90YWxCb3R0b21Cb3hlc0hlaWdodDtcclxuXHRcdFx0dmFyIG5ld01heENoYXJ0QXJlYVdpZHRoID0gd2lkdGggLSB0b3RhbExlZnRCb3hlc1dpZHRoIC0gdG90YWxSaWdodEJveGVzV2lkdGg7XHJcblxyXG5cdFx0XHRpZiAobmV3TWF4Q2hhcnRBcmVhV2lkdGggIT09IG1heENoYXJ0QXJlYVdpZHRoIHx8IG5ld01heENoYXJ0QXJlYUhlaWdodCAhPT0gbWF4Q2hhcnRBcmVhSGVpZ2h0KSB7XHJcblx0XHRcdFx0aGVscGVycy5lYWNoKGxlZnRCb3hlcywgZnVuY3Rpb24oYm94KSB7XHJcblx0XHRcdFx0XHRib3guaGVpZ2h0ID0gbmV3TWF4Q2hhcnRBcmVhSGVpZ2h0O1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRoZWxwZXJzLmVhY2gocmlnaHRCb3hlcywgZnVuY3Rpb24oYm94KSB7XHJcblx0XHRcdFx0XHRib3guaGVpZ2h0ID0gbmV3TWF4Q2hhcnRBcmVhSGVpZ2h0O1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRoZWxwZXJzLmVhY2godG9wQm94ZXMsIGZ1bmN0aW9uKGJveCkge1xyXG5cdFx0XHRcdFx0aWYgKCFib3gub3B0aW9ucy5mdWxsV2lkdGgpIHtcclxuXHRcdFx0XHRcdFx0Ym94LndpZHRoID0gbmV3TWF4Q2hhcnRBcmVhV2lkdGg7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGhlbHBlcnMuZWFjaChib3R0b21Cb3hlcywgZnVuY3Rpb24oYm94KSB7XHJcblx0XHRcdFx0XHRpZiAoIWJveC5vcHRpb25zLmZ1bGxXaWR0aCkge1xyXG5cdFx0XHRcdFx0XHRib3gud2lkdGggPSBuZXdNYXhDaGFydEFyZWFXaWR0aDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0bWF4Q2hhcnRBcmVhSGVpZ2h0ID0gbmV3TWF4Q2hhcnRBcmVhSGVpZ2h0O1xyXG5cdFx0XHRcdG1heENoYXJ0QXJlYVdpZHRoID0gbmV3TWF4Q2hhcnRBcmVhV2lkdGg7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN0ZXAgNyAtIFBvc2l0aW9uIHRoZSBib3hlc1xyXG5cdFx0XHR2YXIgbGVmdCA9IGxlZnRQYWRkaW5nO1xyXG5cdFx0XHR2YXIgdG9wID0gdG9wUGFkZGluZztcclxuXHJcblx0XHRcdGZ1bmN0aW9uIHBsYWNlQm94KGJveCkge1xyXG5cdFx0XHRcdGlmIChib3guaXNIb3Jpem9udGFsKCkpIHtcclxuXHRcdFx0XHRcdGJveC5sZWZ0ID0gYm94Lm9wdGlvbnMuZnVsbFdpZHRoID8gbGVmdFBhZGRpbmcgOiB0b3RhbExlZnRCb3hlc1dpZHRoO1xyXG5cdFx0XHRcdFx0Ym94LnJpZ2h0ID0gYm94Lm9wdGlvbnMuZnVsbFdpZHRoID8gd2lkdGggLSByaWdodFBhZGRpbmcgOiB0b3RhbExlZnRCb3hlc1dpZHRoICsgbWF4Q2hhcnRBcmVhV2lkdGg7XHJcblx0XHRcdFx0XHRib3gudG9wID0gdG9wO1xyXG5cdFx0XHRcdFx0Ym94LmJvdHRvbSA9IHRvcCArIGJveC5oZWlnaHQ7XHJcblxyXG5cdFx0XHRcdFx0Ly8gTW92ZSB0byBuZXh0IHBvaW50XHJcblx0XHRcdFx0XHR0b3AgPSBib3guYm90dG9tO1xyXG5cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0XHRcdGJveC5sZWZ0ID0gbGVmdDtcclxuXHRcdFx0XHRcdGJveC5yaWdodCA9IGxlZnQgKyBib3gud2lkdGg7XHJcblx0XHRcdFx0XHRib3gudG9wID0gdG90YWxUb3BCb3hlc0hlaWdodDtcclxuXHRcdFx0XHRcdGJveC5ib3R0b20gPSB0b3RhbFRvcEJveGVzSGVpZ2h0ICsgbWF4Q2hhcnRBcmVhSGVpZ2h0O1xyXG5cclxuXHRcdFx0XHRcdC8vIE1vdmUgdG8gbmV4dCBwb2ludFxyXG5cdFx0XHRcdFx0bGVmdCA9IGJveC5yaWdodDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGhlbHBlcnMuZWFjaChsZWZ0Qm94ZXMuY29uY2F0KHRvcEJveGVzKSwgcGxhY2VCb3gpO1xyXG5cclxuXHRcdFx0Ly8gQWNjb3VudCBmb3IgY2hhcnQgd2lkdGggYW5kIGhlaWdodFxyXG5cdFx0XHRsZWZ0ICs9IG1heENoYXJ0QXJlYVdpZHRoO1xyXG5cdFx0XHR0b3AgKz0gbWF4Q2hhcnRBcmVhSGVpZ2h0O1xyXG5cclxuXHRcdFx0aGVscGVycy5lYWNoKHJpZ2h0Qm94ZXMsIHBsYWNlQm94KTtcclxuXHRcdFx0aGVscGVycy5lYWNoKGJvdHRvbUJveGVzLCBwbGFjZUJveCk7XHJcblxyXG5cdFx0XHQvLyBTdGVwIDhcclxuXHRcdFx0Y2hhcnRJbnN0YW5jZS5jaGFydEFyZWEgPSB7XHJcblx0XHRcdFx0bGVmdDogdG90YWxMZWZ0Qm94ZXNXaWR0aCxcclxuXHRcdFx0XHR0b3A6IHRvdGFsVG9wQm94ZXNIZWlnaHQsXHJcblx0XHRcdFx0cmlnaHQ6IHRvdGFsTGVmdEJveGVzV2lkdGggKyBtYXhDaGFydEFyZWFXaWR0aCxcclxuXHRcdFx0XHRib3R0b206IHRvdGFsVG9wQm94ZXNIZWlnaHQgKyBtYXhDaGFydEFyZWFIZWlnaHRcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIFN0ZXAgOVxyXG5cdFx0XHRoZWxwZXJzLmVhY2goY2hhcnRBcmVhQm94ZXMsIGZ1bmN0aW9uKGJveCkge1xyXG5cdFx0XHRcdGJveC5sZWZ0ID0gY2hhcnRJbnN0YW5jZS5jaGFydEFyZWEubGVmdDtcclxuXHRcdFx0XHRib3gudG9wID0gY2hhcnRJbnN0YW5jZS5jaGFydEFyZWEudG9wO1xyXG5cdFx0XHRcdGJveC5yaWdodCA9IGNoYXJ0SW5zdGFuY2UuY2hhcnRBcmVhLnJpZ2h0O1xyXG5cdFx0XHRcdGJveC5ib3R0b20gPSBjaGFydEluc3RhbmNlLmNoYXJ0QXJlYS5ib3R0b207XHJcblxyXG5cdFx0XHRcdGJveC51cGRhdGUobWF4Q2hhcnRBcmVhV2lkdGgsIG1heENoYXJ0QXJlYUhlaWdodCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH07XHJcbn07XHJcbiJdfQ==