# Looker Studio Dashboard Setup Guide

This guide will help you create a Looker Studio dashboard to visualize your existing Google Analytics data, including tile milestones and other game metrics.

## Your Current GA4 Events

Based on your codebase, you're tracking these events:

1. **tile_milestone** - Fired when players reach 128, 256, 512, 1024, 2048, 4096, or 8192
   - `event_category`: "Gameplay"
   - `event_label`: "Reached X Tile" (e.g., "Reached 2048 Tile")
   - `value`: The tile value (128, 256, 512, etc.)

2. **Game_Played** - Fired when a game ends
   - `event_category`: "Win" or "Loss"
   - `event_label`: "Score: X"
   - `value`: The final score

3. **game_start** - Fired when a game starts
   - `event_category`: "Gameplay"
   - `event_label`: "New Game Started"

4. **score_submitted** - Fired when score is successfully submitted
   - `event_category`: "Gameplay"
   - `event_label`: "Score Submitted Successfully"
   - `value`: The score

5. **Leaderboard events** - websocket_connected, view_leaderboard, leaderboard_changed

## Step 1: Set Up Custom Dimensions in GA4 (Optional but Recommended)

While GA4 automatically tracks `event_label` and `value`, setting up custom dimensions makes filtering easier:

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property (G-4Y07EC3TPZ)
3. Click **Admin** (gear icon in bottom left)
4. Under **Property** column, click **Custom definitions**
5. Click **Create custom dimension**

### Recommended Custom Dimensions:

**Dimension 1: Tile Value**
- Dimension name: `Tile Value`
- Scope: `Event`
- Description: `The tile value reached (from tile_milestone event)`
- Event parameter: `value`

**Dimension 2: Game Result**
- Dimension name: `Game Result`
- Scope: `Event`
- Description: `Win or Loss from Game_Played event`
- Event parameter: `event_category`

> **Note**: It takes 24-48 hours for custom dimensions to start collecting data, but your historical data will be available immediately once you create the dimension.

## Step 2: Create Your Looker Studio Dashboard

### Initial Setup:

1. Go to [Looker Studio](https://lookerstudio.google.com/)
2. Click **Create** → **Report**
3. Choose **Google Analytics** as your data source
4. Select your GA4 property (GetFrisch - G-4Y07EC3TPZ)
5. Click **Add to Report**

### Chart 1: Tile Milestone Distribution (Bar Chart)

**Purpose**: See how many players reach each tile milestone

1. Click **Add a chart** → **Bar chart**
2. Configure:
   - **Dimension**: `Event name` with filter = `tile_milestone`
   - **Breakdown dimension**: `Event label` (this shows "Reached X Tile")
   - **Metric**: `Event count`
   - **Sort**: By Event count, descending

**Alternative using Value**:
   - **Dimension**: `Event value` (will show 128, 256, 512, etc.)
   - **Metric**: `Event count`

### Chart 2: Tile Achievements Over Time (Time Series)

**Purpose**: Track tile milestone achievements by date

1. Click **Add a chart** → **Time series chart**
2. Configure:
   - **Dimension**: `Date`
   - **Breakdown dimension**: `Event label` (filter for tile_milestone events)
   - **Metric**: `Event count`
   - **Date range**: Last 90 days (or custom)

### Chart 3: Win/Loss Ratio (Pie Chart)

**Purpose**: See percentage of wins vs losses

1. Click **Add a chart** → **Pie chart**
2. Configure:
   - **Dimension**: `Event category` with filter: Event name = `Game_Played`
   - **Metric**: `Event count`
   - This will show "Win" vs "Loss" slices

### Chart 4: Game Activity (Scorecard)

**Purpose**: Show total games played

1. Click **Add a chart** → **Scorecard**
2. Configure:
   - **Metric**: `Event count`
   - **Filter**: Event name = `game_start`
   - **Comparison**: Previous period
   - **Label**: "Total Games Played"

### Chart 5: Top Tile Achievement (Scorecard)

**Purpose**: Show most common highest tile reached

1. Click **Add a chart** → **Scorecard**
2. Configure:
   - **Metric**: `Event count`
   - **Filter**: Event name = `tile_milestone` AND Event label = `Reached 2048 Tile`
   - **Label**: "Players Who Reached 2048"

### Chart 6: Score Distribution (Table)

**Purpose**: See average and total scores

1. Click **Add a chart** → **Table**
2. Configure:
   - **Dimension**: `Event label` (will show "Score: X")
   - **Metric 1**: `Event count`
   - **Metric 2**: `Event value` (aggregation: Average)
   - **Metric 3**: `Event value` (aggregation: Sum)
   - **Filter**: Event name = `Game_Played`

### Chart 7: Daily Active Players (Time Series)

**Purpose**: Track player engagement over time

1. Click **Add a chart** → **Time series**
2. Configure:
   - **Dimension**: `Date`
   - **Metric**: `Active users`
   - **Filter**: Event name = `game_start`

### Chart 8: Tile Milestone Funnel (Table with Bar)

**Purpose**: See drop-off rates between milestones

1. Click **Add a chart** → **Table with bars**
2. Configure:
   - **Dimension**: `Event label`
   - **Metric**: `Event count`
   - **Filter**: Event name = `tile_milestone`
   - **Sort**: By Event label (you may need to create a custom field to sort by tile value)

## Step 3: Advanced Features

### Custom Calculated Fields

To extract the tile value from "Reached X Tile" labels:

1. In your report, click **Add a field**
2. Create a new field called `Tile Number`
3. Formula:
```
CASE
  WHEN REGEXP_CONTAINS(Event Label, "128") THEN "128"
  WHEN REGEXP_CONTAINS(Event Label, "256") THEN "256"
  WHEN REGEXP_CONTAINS(Event Label, "512") THEN "512"
  WHEN REGEXP_CONTAINS(Event Label, "1024") THEN "1024"
  WHEN REGEXP_CONTAINS(Event Label, "2048") THEN "2048"
  WHEN REGEXP_CONTAINS(Event Label, "4096") THEN "4096"
  WHEN REGEXP_CONTAINS(Event Label, "8192") THEN "8192"
  ELSE "Other"
END
```

### Win Rate Calculation

Create a calculated field for win percentage:

1. Create field: `Win Rate`
2. Formula:
```
(COUNT(CASE WHEN Event Category = "Win" THEN 1 END) /
COUNT(CASE WHEN Event Name = "Game_Played" THEN 1 END)) * 100
```

### Conversion Funnel (Players reaching 2048)

1. Create field: `2048 Conversion Rate`
2. Formula:
```
(Event count WHERE Event Label = "Reached 2048 Tile") /
(Event count WHERE Event Name = "game_start") * 100
```

## Step 4: Add Filters and Controls

### Date Range Control
1. Click **Add a control** → **Date range control**
2. Position at top of dashboard
3. This allows filtering by any date range to see historical data

### Event Type Filter
1. Click **Add a control** → **Drop-down list**
2. Control field: `Event name`
3. This allows filtering by specific events (tile_milestone, Game_Played, etc.)

## Step 5: Share Your Dashboard

1. Click **Share** button
2. Options:
   - **View link**: Anyone with link can view (read-only)
   - **Edit link**: Allow others to edit
   - **Email**: Send to specific people
   - **Embed**: Embed in a webpage
   - **Schedule email**: Automatic email reports

## Example Dashboard Layout

```
+------------------------------------------------------------------+
|  GetFrisch Analytics Dashboard          [Date Range Filter]     |
+------------------------------------------------------------------+
|  [Total Games]  [Total Players]  [Avg Score]  [2048 Reached]   |
+------------------------------------------------------------------+
|                                                                  |
|  Tile Milestone Distribution                                    |
|  (Bar chart showing 128, 256, 512... achievements)             |
|                                                                  |
+------------------------------------------------------------------+
|                        |                                         |
|  Win/Loss Ratio        |  Tile Achievements Over Time           |
|  (Pie chart)           |  (Time series)                          |
|                        |                                         |
+------------------------------------------------------------------+
|                                                                  |
|  Score Distribution Table                                       |
|  (Shows all scores with averages)                              |
|                                                                  |
+------------------------------------------------------------------+
```

## Tips for Using Your Dashboard

1. **Access Historical Data**: Use the date range filter to view data from any time period
2. **Compare Periods**: Most charts support date comparison (e.g., this month vs last month)
3. **Export Data**: Click the three dots on any chart → Download as CSV/PDF
4. **Refresh Data**: GA4 data typically updates within 24 hours; click refresh to get latest
5. **Mobile View**: Looker Studio dashboards are mobile-responsive

## Accessing Other GA4 Parameters

Your GA4 events include these standard parameters that are automatically available:
- `event_name`: The event type (tile_milestone, Game_Played, etc.)
- `event_label`: Custom label for each event
- `event_category`: Category grouping
- `event_value`: Numeric value (tile number, score, etc.)
- `event_timestamp`: When the event occurred
- `user_pseudo_id`: Anonymous user identifier
- `session_id`: Session identifier

You can use any of these in your Looker Studio charts without any code changes.

## Troubleshooting

**Problem**: No data showing
- **Solution**: Check date range - make sure it includes dates when you had traffic

**Problem**: Event labels not showing correctly
- **Solution**: Add filter: Event name equals "tile_milestone" or "Game_Played"

**Problem**: Values showing as strings instead of numbers
- **Solution**: Change field type to Number in the chart configuration

**Problem**: Can't find specific parameter
- **Solution**: It may be in `event_label` or `event_value` - check both fields

## Next Steps

After creating your dashboard, you can:
1. Pin it to your browser for easy access
2. Set up scheduled email reports
3. Create additional custom fields for advanced metrics
4. Add filters for specific user segments
5. Build cohort analysis to track player retention

Your GA4 data is already there - this dashboard just makes it visible!
