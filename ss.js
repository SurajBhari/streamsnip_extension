(function() {
    'use strict';
    const delay = (delayInms) => {
        return new Promise(resolve => setTimeout(resolve, delayInms));
    };
    const timeToPercentage = (time, total_time) => {
        return (time / total_time) * 100;
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
        console.log(data);
        var progreess_bar = document.querySelectorAll('.ytp-progress-bar');
        var container = document.querySelector('.ytp-progress-bar-container');
        var total_time = parseInt(progreess_bar[0].getAttribute('aria-valuemax'));
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

            console.log(start_time, end_time, total_time);
            var bar = document.createElement('li');
            bar.classList.add('previewbar');
            bar.innerHTML = '&nbsp;';
            bar.style.backgroundColor = 'green';
            bar.style.position = "absolute";
            bar.style.left = timeToPercentage(start_time, total_time) + '%';
            //bar.style.right = timeToPercentage(end_time, total_time) + '%';
            container.appendChild(bar);
            console.log(bar.style.left, bar.style.right)
        }

    };
    run();
})();
