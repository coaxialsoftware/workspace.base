
((ide, speechSynthesis) => {
"use strict";

ide.plugins.register('speech', {

	disabled: false,

	startNotify()
	{
		const notify = ide.notify;

		ide.notify = (msg, kls) =>
		{
			if (!this.disabled)
			{
			const
				utter = new SpeechSynthesisUtterance(typeof(msg)==='string' ? msg : msg.title),
				voice = ide.project.get('speech.voice')
			;
				if (voice)
					utter.voice = this.voiceMap[voice];

				speechSynthesis.speak(utter);
			}

			return notify.call(ide, msg, kls);
		};
	},

	start()
	{
		if (!speechSynthesis)
			return ide.warn('Speech Synthesis not supported.');

		this.voices = speechSynthesis.getVoices();
		this.voiceMap = {};
		this.disabled = !!this.data('disabled');

		this.voices.forEach(v => {
			this.voiceMap[v.name] = v;
		});

		this.startNotify();
	},

	disable()
	{
		this.disabled = true;
		this.data('disabled', 1);
	},

	enable()
	{
		this.disabled = false;
		this.data('disabled', undefined);
	},

	commands: {
		speech: {
			fn(state)
			{
				if (state==='disable')
					this.disable();
				else if (state==='enable')
					this.enable();
			}
		},
		'speech.disable': function() { this.disable(); },
		'speech.enable': function() { this.enable(); },
		'speech.voices': function() {
			const result = new ide.ListEditor({
				title: 'speech.voices'
			});

			result.add(this.voices.map(v => ({
				title: v.name, tags: [ v.lang ]
			})));

			return result;
		}
	}

});

})(this.ide, this.speechSynthesis);