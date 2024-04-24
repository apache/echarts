describe('Axis Label Generation', function () {
    // Test for time axis
    it('should generate correct labels for time axis with non-empty data series', function () {
        // Create a simple line chart configuration with a time axis and a non-empty data series
        const chartInstance = echarts.init(document.createElement('div'));
        const option = {
            xAxis: {
                type: 'time'
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                type: 'line',
                data: [
                    { value: [new Date('2021-03-15'), 120] },
                    { value: [new Date('2021-03-16'), 200] },
                    // ...more data points
                ]
            }]
        };
        chartInstance.setOption(option);

        // Get the labels from the x-axis
        const xAxis = chartInstance.getModel().getComponent('xAxis').axis;
        const labels = xAxis.getViewLabels().map(labelItem => labelItem.formattedLabel);

        // Check if the labels contain the expected date range
        expect(labels).toContain('2021-03-15');
        expect(labels).toContain('2021-03-16');
        // ...check other expected labels

        // Dispose the instance to release resources
        chartInstance.dispose();
    });

    it('should not generate labels for empty data series on a time axis', function () {
        const chartInstance = echarts.init(document.createElement('div'));
        const option = {
            xAxis: {
                type: 'time'
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                type: 'line',
                data: [] // Empty data series
            }]
        };
        chartInstance.setOption(option);

        // Get the labels from the x-axis
        const xAxis = chartInstance.getModel().getComponent('xAxis').axis;
        const labels = xAxis.getViewLabels();

        // Ensure no labels were generated
        expect(labels.length).toBe(0);

        chartInstance.dispose();
    });
});
