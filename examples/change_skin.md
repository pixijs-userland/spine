### Changing Skins

Once skins are defined in Spine, it's possible to change them in runtime. According to the Spine libraries:
> If skin is already set, new skin can change only slots attached in old skin.

So if a skin has been set and another skin is to be set, it may result in the newer skin not showing. To workaround this issue, set the skin to null and then set the skin like so:

```js
var spineCharacter = new PIXI.spine.Spine(resources.boy.spineData);
var skeleton = spineCharacter.skeleton;
 
function setSkinByName(skinName) {
  skeleton.setSkin(null);
  skeleton.setSkinByName(skinName);
}

setSkinByName('lighter');

```

If the skin is changed whilst the spineCharacter is animating, there may be a problem with the draw order of some assets. This will resolve when the animation finishes it's loop or the animation is restarted.

### How to make combined skin

According official manual you can combine skins with following method:

```js
 // create new empty skin
const newSkin = <any> new PIXI.spine.core.Skin("combined-skin");
// add base skin
newSkin.addSkin(char.spineData.findSkin("aa_default"));
// add parital skins over base
newSkin.addSkin(itemSkin1);
newSkin.addSkin(itemSkin2);
newSkin.addSkin(itemSkin3);

char.skeleton.setSkin(newSkin); 

//Reset slots to remove not used attachments
char.skeleton.setSlotsToSetupPose(); 
```

