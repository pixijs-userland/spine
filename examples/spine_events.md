### How to use spine events

spine-ts way

```js
animation.state.addListener({
    event: function(entry, event) { console.log('event fired '+event.data+' at track' + entry.trackIndex) },
    complete: function(entry) { console.log('track '+entry.trackIndex+' completed '+entry.loopsCount()+' times') },
    start: function(entry) { console.log('animation is set at '+entry.trackIndex) },
    end: function(entry) { console.log('animation was ended at '+entry.trackIndex) },
    
    
    dispose: function(entry) { console.log('animation was disposed at '+entry.trackIndex) },
    interrupted: function(entry) { console.log('animation was interrupted at '+entry.trackIndex) }
});

animation.state.addAnimation(0, 'walk', true);
animation.state.tracks[0].listener = { 
    complete: function(trackEntry, count) { console.log('my track completed '+trackEntry.loopsCount()+' times') }
}

```

DEPRECATED, OLD WAY:

```js
animation.state.onEvent = function(trackIndex, event) { console.log('event fired '+event.data) };
animation.state.onComplete = function(trackIndex, loopCount) { console.log('track '+trackIndex+' completed '+count+' times') };
animation.state.onStart =function(trackIndex) { console.log('animation is set at '+trackIndex) };
animation.state.onEnd = function(trackIndex) { console.log('animation was ended at '+trackIndex) };
// same for track, if it exists
animation.state.addAnimation(0, 'walk', true);
animation.state.tracks[0].onEnd = function(trackIndex, count) { console.log('my track ended :)') }
```
