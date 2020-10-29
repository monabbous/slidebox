# Slidebox
![Example](https://i.imgur.com/yyRPh0R.gif)
## [Example (click me)](https://htmlpreview.github.io/?https://github.com/monabbous/slidebox/blob/master/examples/simple.html)
As you can see in the example above, this slidebox is easy to configure with these two css properties, `color` and `font-size`.

### Quick Setup
Include in your html

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css"/>
    <link rel="stylesheet" href="https://unpkg.com/@monabbous/slidebox@0.0.3/dist/css/slidebox.css"/>

Add the `slidebox` class

    <input style="font-size: 24px" type="checkbox" class="slidebox">
    
## Installation (Sass)
#### 1. Font Awesome
First you must include **[Font Awesome](https://i.imgur.com/yyRPh0R.gif)** in your project (Preferable Font Awesome 5).
#### 2. Slidebox

Using `Sass` with `NPM` just install with

    npm i @monabbous/slidebox
    
Then include in your sass style file
    
    @import '~@monabbous/slidebox';

## Usage
Simply in your checkbox element add the slidebox class.

    <input type="checkbox" class="slidebox">
    
### Custom Style
Just like the Example, you can modify the color and the size of the checkbox.

    <input style="font-size: 24px" type="checkbox" class="slidebox">

Make sure when modifying the color to add class `dark` when using a dark color, and `light` when using a light color.

    <!-- dark color -->
    <input style="color:#040491" type="checkbox" class="slidebox dark">
    
    <!-- light color -->
    <input style="color:#a8a8ff" type="checkbox" class="slidebox light">

You can also invert the visible output of the slide box, where the value of the checkbox is the opposite of how it is shown.

    <input type="checkbox" class="slidebox inverted">

### Changing the default Configuration
    
    $slideboxColorDefaultColor: blue;
    $slideboxClassPrefix: 'nabbous-';
    @import '~@monabbous/slidebox';
