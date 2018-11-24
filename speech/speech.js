
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

		this.voices.forEach(v => {
			this.voiceMap[v.name] = v;
		});

		this.startNotify();
	},

	commands: {
		speech: {
			fn(state)
			{
				if (state==='disable')
					this.disabled = true;
				else if (state==='enable')
					this.disabled = false;
			}
		},
		'speech.disable': function() { this.disabled = true; },
		'speech.enable': function() { this.disabled = false; },
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