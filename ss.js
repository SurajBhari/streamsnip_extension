(function() {
    'use strict';
    const delay = (delayInms) => {
        return new Promise(resolve => setTimeout(resolve, delayInms));
    };
    const timeToPercentage = (time, total_time) => {
        return (time / total_time) * 100;
    }
    const timeToRightPercentage = (time, total_time) => {
        return 100 - (time / total_time) * 100;
    }
    async function run(){
        console.log('Streamsnip Running');
        var videoId = null;
        // get current url
        let url = window.location.href;
        if(url.includes("watch")){
            let urlParts = url.split('/');
            videoId = urlParts[urlParts.length-1];
            videoId = videoId.split('?')[1].split('v=')[1];
            videoId = videoId.split('&')[0];
        }
        else{
            // not on a watch page
            last_video_id = null;
            await delay(5000);
            return;
        }
        console.log('Video ID:', videoId);
        let qurl = 'https://streamsnip.com/extension/clips/' + videoId;
        let response = await fetch(qurl);
        let data = await response.json();
        if(!data){
            return;
        }
        var progreess_bar = document.querySelectorAll('.ytp-progress-bar');
        var container = document.querySelector('.ytp-progress-bar-container');
        var ul = document.createElement('ul');
        var tooltip_text = document.querySelectorAll(".ytp-tooltip-text");
        if(tooltip_text.length > 0){
            tooltip_text = tooltip_text[0];
        }
        ul.id = 'previewbar';
        ul.classList.add('previewbarstyle');
        var total_time = parseInt(progreess_bar[0].getAttribute('aria-valuemax'));
        var lookuptable = []; // star_time, end_time, message
        for(let i=0; i<data.length; i++){
            var clip = data[i];
            var start_time = clip.clip_time
            var end_time = clip.clip_time - clip.delay;
            if(start_time < end_time){
                start_time, end_time = end_time, start_time;
            }
            // int start_time and end_time
            start_time = parseInt(start_time);
            end_time = parseInt(end_time);

            var bar = document.createElement('li');
            bar.classList.add('previewbar');
            bar.innerHTML = '&nbsp;';
            bar.style.position = "absolute";
            bar.style.left = timeToPercentage(start_time, total_time) + '%';
            bar.style.right = timeToRightPercentage(end_time, total_time) + '%';
            ul.appendChild(bar);
            lookuptable.push({'start_time': start_time, 'end_time': end_time, 'message': clip.message}); 
        }
        container.appendChild(ul);
        const seekBar = document.querySelector(".ytp-progress-bar-container");
        if(!seekBar){
            return;
        }
        let mouseOnSeekBar = false;

        seekBar.addEventListener("mouseenter", () => {
            mouseOnSeekBar = true;
        });

        seekBar.addEventListener("mouseleave", () => {
            mouseOnSeekBar = false;
        });
        var last_mouse_position = null;
        seekBar.addEventListener("mousemove", (e) => {
            const timeInSeconds = ((e.clientX - seekBar.getBoundingClientRect().x) / seekBar.clientWidth);
            if(last_mouse_position == e.clientX){
                return;
            }
            last_mouse_position = e.clientX;
            // timeInSeconds is a value between 0 and 1 then get the time 
            var time = timeInSeconds * total_time;
            time = parseInt(time);
            for(let i=0; i<lookuptable.length; i++){
                if(time >= lookuptable[i].start_time && time <= lookuptable[i].end_time){
                    var message = lookuptable[i].message;
                    /*
                    var preview = document.querySelector('.preview');
                    if(preview){
                        preview.remove();
                    }
                    preview = document.createElement('div');
                    preview.classList.add('preview');
                    preview.innerHTML = message;
                    preview.style.position = "absolute";
                    preview.style.top = '0';
                    preview.style.left = e.clientX + 'px';
                    preview.style.backgroundColor = 'black';
                    preview.style.color = 'white';
                    preview.style.padding = '5px';
                    preview.style.borderRadius = '5px';
                    preview.style.zIndex = '1000';
                    preview.style.transform = 'translate(-50%, -100%)';
                    preview.style.pointerEvents = 'none';
                    seekBar.appendChild(preview);
                    */
                    tooltip_text.textContent += ' ' + message;
                }
            }
            
        });
    };

    run();
})();
