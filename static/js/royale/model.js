var slideDelay = 600;
var app = null;
var cycleInterval = null;
var refreshInterval = null;

var Metric = Backbone.Model.extend({

	defaults: {
		id: null,
		metric: {},
		chart: {}
	}

});

var MetricList = Backbone.Collection.extend({
	model: Metric,
	url: '/metrics'
});

var CycleControl = Backbone.Model.extend({

	defaults: {
		prefix: 'static/img/',
		cycle: true
	},

	src: function() {
		return this.get('prefix') + (this.get('cycle') ? 'pause.png' : 'play.png');
	}

});

var CycleControlView = Backbone.View.extend({

	el: $('#control-wrapper'),
	className: 'cycle-control',

	initialize: function() {
		this.source = $('#cycle-control-template').html();
		this.template = Handlebars.compile(this.source);
		this.listenTo(this.model, 'change', this.render);
	},

	render: function() {
		this.$el.html(this.template({
			src: this.model.src()
		}));
		return this;
	},

	events: {
		'click': 'controlClick'
	},

	controlClick: function() {
		this.model.set('cycle', !(this.model.get('cycle')));
	}

});

var MetricView = Backbone.View.extend({

	className: 'feed-element',

	initialize: function() {
		this.guid = guid();
		this.source = $('#feed-template').html();
		this.template = Handlebars.compile(this.source);
		this.listenTo(this.model, 'remove', this.slideOut);
	},

	render: function() {

		this.$el.html(this.template({
			id: this.model.id,
			current: this.model.get('metric').current,
			compare: this.model.get('metric').compare,
			updated: moment(this.model.get('metric').updated).fromNow(),
			guid: this.guid
		}));

		var spec = this.model.get('chart').chart;
		(function (renderId, thisGuid) {
			vg.parse.spec(spec, function(chart) {
				chart({el: '#chart-' + thisGuid})
					.width($('.feed-element').width() * 0.5)
					.height($('.feed-element').height() * 0.74)
					.update();
			});
		})(this.model.id, this.guid);

		return this;
	},

	slideOut: function() {
		(function(view) {
			view.$el.animate({height: 0}, slideDelay, function() { view.remove(); });
		})(this);
	}

});

var FeedView = Backbone.View.extend({

	el: $('#wrapper'),

	initialize: function() {
		this.views = [];

		this.control = new CycleControlView({model: new CycleControl()});
		this.control.render();

		this.collection = new MetricList();
		this.listenTo(this.collection, 'add', this.addOne);
		this.listenTo(this.collection, 'remove', this.removeOne);
		this.collection.fetch();
	},

	addOne: function(model, collection, options) {
		var newView = new MetricView({model: model});
		this.views.push(newView);
		this.$el.append(newView.render().el);
	},

	removeOne: function(model, collection, options) {
		this.views = _.filter(this.views, function(view) {
			return (view.model !== this);
		}, model);
	},

	render: function(reverse) {
		_.each(this.views, function(view) {
			if (reverse === true) {
				this.$el.append(view.render().el);
			} else {
				this.$el.prepend(view.render().el);
			}
		}, this);
		return this;
	},

	cycle: function() {
		if (this.control.model.get('cycle')) {
			var last = this.collection.pop();
			setTimeout(function() { app.collection.unshift(last); }, 1000);
		}
	}

});

$(document).ready(function() {
	app = new FeedView;
	cycleInterval = setInterval(function() { app.cycle(); }, 1500);
	refreshInterval = setInterval(function() { app.collection.fetch(); },
								  60000);
});
