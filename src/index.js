import "./index.scss";

import $ from "jquery";

import Chartkick from "chartkick";
import Chart from "chart.js/auto";

Chartkick.use(Chart);

import { Workspace, Display } from "./workspace/workspace.js"

let workspace;

$(function() {
		workspace = new Workspace($('#lab_script_source')[0]);

		workspace.on("compute", function() {
				let ids = workspace.displays.map(d => d.element.id);

				workspace.displays.forEach(function(d) {
						let param = d.title.replace(/\s+/g, '-').replace(/[^-\w]/g, '') + '-' + d.position;
						d.element.id = 'chart-' + param;

						if (!$('.display-area').children('#' + d.element.id).length)
								$('.display-area').append(d.element);
				});

				ids = workspace.displays.map(d => d.element.id);
				$('.display-area').children().each(function() {
						if (!ids.includes(this.id))
								$(this).remove();
				});

				ids = workspace.script_params.map(p => p.element.id);
				workspace.script_params.forEach(function(p) {
						p.element.id = 'param-' + p.id;

						if (!$('[data-params]').find('#' + p.element.id).length)
								$('[data-params]').append($('<li>').append(p.element));
				});
		});


		workspace.display();

		$('[type=checkbox][value=chart-table]').prop('checked', false);
		$('[type=checkbox][value=chart-table]').trigger('change');
});
