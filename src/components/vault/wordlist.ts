/**
 * Built-in English wordlist for passphrases: 830 common, short (3–7 letters)
 * words that are easy to type and spell → log2(830) ≈ 9.7 bits per word.
 */
export const WORDLIST: readonly string[] = `
able acid acorn actor adapt admit adobe adult agent agile aisle alarm album alert alien
alley alloy alpha amber amuse angle ankle apple april apron arbor arena argue armor aroma
arrow aspen atlas atom attic audio audit avoid awake award bacon badge bagel baker balmy
bamboo banjo barn baron basil basin batch beach beacon beard beast begin bench berry bike
birch bison black blade blank blast blaze blend bliss block bloom blue blush board boat
bonus boost booth bored bottle bounce brain brave bread brick bride brief bring brisk broad
brook broom brush bubble bucket buddy budget buggy build bulb bunny burst butter cabin cable
cactus cadet cake camel camera camp canal candy canoe canvas canyon cape cargo carol carrot
carve case castle cedar chalk champ charm chart chase cheek cheer chef cherry chess chest
chili chime chip choir chunk cider cinema circle civic claim clamp clap clay clean clerk
click cliff climb clock cloud clover clown coach coast cobra cocoa coffee coin comet comic
coral cord corn cosmic cotton couch count cove cozy crab craft crane crate crawl crayon
cream creek crest crew cricket crisp crown crumb crush crust cube cupid curve cycle daily
dairy daisy dance dash dawn decal decor deer delta denim depot derby desert desk dial
diary diner disco ditch diver dizzy dock dodge dolphin donut dove draft dragon drama dream
dress drift drink drive drum duck dune dust eagle early earth easel echo eclipse edge
elbow elder elegy elite elk ember emoji enjoy entry envoy equal error essay ethic event
exact exile exit expo fable fabric facet fairy faith falcon fancy fargo fault feast feather
fence ferry fiber field fiesta final finch fjord flag flame flash fleet flint flock flora
flour fluid flute focus foggy folio forest forge fork fossil fox frame fresh fridge frog
frost fruit fudge fungi funny gadget galaxy gamer garden garlic gauge gecko gem genie giant
ginger giraffe glad glass glide globe glove glow goat gold golf goose gourd grace grain
grape graph grass gravy great green grid grill grin groove group grove guard guava guest
guide guitar habit hammer harbor harp hatch haven hawk hazel heart hedge helium helmet herb
hero hiker hippo hobby honey hood hoop horse hotel house humble humor husky hybrid icicle
icon igloo image index inlet input irony island ivory jacket jaguar jazz jeans jelly jewel
jiffy jogger joint jolly judge juice jumbo jungle junior kayak kebab kettle kiosk kitten
kiwi knack knee koala label ladder lake lamp lantern laser latch lava lawn layer lemon
lens level lilac lily limit linen lion liquid llama lobby lobster local lodge logic lotus
lucky lunar lunch lyric macro magic magnet mango maple marble march mascot mason meadow
medal melon memo menu merit metal meteor midst mild mimic mint mirror mocha model modem
mole monkey moon moose morning mosaic moss motel motor mouse movie muffin mural museum music
nacho nature navy nectar needle neon nest nickel night ninja noble noodle north notch novel
nugget oasis ocean octave olive omega onion opal opera orbit orchid organ otter outfit oval
owl oxygen oyster paddle pagoda palace palm panda panel panther paper parade parrot pasta
patch pause peach peanut pearl pebble pedal pencil penny pepper perch piano pickle pigeon
pilot pinch pine pixel pizza plain planet plaza plum plush poem polar pony popcorn poppy
porch potato pouch prairie prism prize proud prune puddle pulse puma pupil puppy purple
puzzle pyramid quail quartz queen quest quick quiet quilt quiz rabbit radar radio raft
rain raisin rally ranch raven razor recipe reef relax relay remix rhino rhyme ribbon rice
ridge ripple river roast robin robot rocket rodeo roof rookie rose rover royal ruby rugby
ruler rumba runway rustic saddle safari saga salad salmon salsa sample sandal satin sauce
savor scale scarf scenic school scout scroll season seed shadow shark shelf shell sherpa
shield shiny shore shrimp sierra silk silver simple siren sketch skiing skull slate sled
slope smile smoke snack snail snake sneaker snow soap soccer socket sofa solar sonic spark
spice spider spike spiral splash spoon sport spring sprout spruce squid stable stamp star
steam steel stem stereo stone storm story stove straw stream stripe studio sugar suite
summer summit sunny super surf swan sweater swift swing syrup table taco talent tango
tank tarot teapot temple tennis tent thorn thrill thumb thunder ticket tiger timber tiny
toast tomato topaz torch tornado toucan tower track trail train treat trend tribe trophy
tropic truck trumpet tulip tuna tundra tunnel turkey turtle tutor tuxedo twig twist ultra
umbra uncle unity upbeat urban usher valley valve vanilla vapor velvet venus verse vessel
video villa vinyl violet violin viper visor vista vivid vocal voice volcano voyage waffle
wagon walnut walrus wander warm wasabi water wave wheat whale whisk willow window winter
wisdom wizard wolf wombat wonder yacht yogurt yodel young yummy zebra zenith zephyr zero
zesty zigzag zinc zipper zodiac zone zoom acre beam bolt bone calm card chord cinder
coil cork crow cult dart dome dusk fern fiddle
`
  .trim()
  .split(/\s+/);
