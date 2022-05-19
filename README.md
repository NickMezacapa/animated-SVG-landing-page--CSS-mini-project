# animated-3D-SVG-landing-page--CSS-mini-project
### Preview


https://user-images.githubusercontent.com/89874146/169399900-44b757ed-fb52-4013-985f-720b0b63c4bf.mov



This is an example landing page that could be used for a portfolio. It is a 3D animated SVG rendered by a Canvas element and WebGL shaders.
This was an easy mini-project to enhance my skills using the canvas.<br><br>
### Responsiveness
Dealing with canvas responsivity on different screen dimensions can be a hassle. I've included the following resize logic to ensure the canvas responds to different screen sizes without reloading the page:
```
// Resize the canvas when the window is resized.

const init = () => {
	canvas.width = window.innerWidth * dpr;
	canvas.height = window.innerHeight * dpr;
	canvas.style.width = `${window.innerWidth}px`;
	canvas.style.height = `${window.innerHeight}px`;
	document.body.appendChild(canvas);
};

window.onresize = init;

```
<br>
Documentation included in source code. 
