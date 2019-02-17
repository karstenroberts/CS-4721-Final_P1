var points;
var colors;

var NumVertices  = 36;

var gl;
let id;

var fovy = 30.0;  // Field-of-view in Y direction angle (in degrees)
var aspect;       // Viewport aspect ratio
var program;

var mvMatrix, pMatrix;
var modelView, projection;
var eye;

const at = vec3(0.0, -2.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
const va = vec4(0.0, 0.0, -1.0,1.5);
const vb = vec4(0.0, 0.942809, 0.333333, 1.5);
const vc = vec4(-0.816497, -0.471405, 0.333333, 1.5);
const vd = vec4(0.816497, -0.471405, 0.333333,1.5);
const spacing = -2.0;
let stack = [];
const spheres = tetrahedron(va, vb, vc, vd, 6);
const cubes = cube();
const mobileRoot = tetrahedron(va, vb, vc, vd, 0);
const topBars = bars(1);
const middleBars = bars(.5);
const bottomBars = bars(0);


const color = {
    "RED": vec4(1.0, 0.0, 0.0, 1.0),
    "BLUE":  vec4(0.0, 0.0, 1.0, 1.0),
    "MAGENTA": vec4(1.0, 0.0, 1.0, 1.0),
    "GREEN": vec4(0.0, 1.0, 0.0, 1.0),
    "TEAL": vec4(0.0, 0.7, 0.8, 1.0),
    "WHITE": vec4(1.0, 1.0, 1.0, 1.0),
    "BLACK": vec4(0.0, 0.0, 0.0, 1.0)
};

function main()
{
	// Retrieve <canvas> element
	var canvas = document.getElementById('webgl');

	// Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas);

	//Check that the return value is not null.
	if (!gl)
	{
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	program = initShaders(gl, "vshader", "fshader");
	gl.useProgram(program);

	//Set up the viewport
    gl.viewport( 0, 0, 800, 800);

    aspect =  canvas.width/canvas.height;
    // Set clear color
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Clear <canvas> by clearing the color buffer
    gl.enable(gl.DEPTH_TEST);

	points = [];
	colors = [];

    projection = gl.getUniformLocation(program, "projectionMatrix");
    modelView = gl.getUniformLocation(program, "modelMatrix");

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    render();
}

function triangle(a, b, c) {
    let pointsArray = [];
    let normalsArray = [];

    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    // normals are vectors
    normalsArray.push(a[0],a[1], a[2], 0.0);
    normalsArray.push(b[0],b[1], b[2], 0.0);
    normalsArray.push(c[0],c[1], c[2], 0.0);
    //index += 3;
    return {"pointsArray": pointsArray, "normalsArray": normalsArray}
}


function divideTriangle(a, b, c, count) {
    if ( count > 0 ) {

        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        const t1 = divideTriangle( a, ab, ac, count - 1 );
        const t2 = divideTriangle( ab, b, bc, count - 1 );
        const t3 = divideTriangle( bc, c, ac, count - 1 );
        const t4 = divideTriangle( ab, bc, ac, count - 1 );
        return {"pointsArray": t1.pointsArray.concat(t2.pointsArray.concat(t3.pointsArray.concat(t4.pointsArray))), "normalsArray": t1.normalsArray.concat(t2.normalsArray.concat(t3.normalsArray.concat(t4.normalsArray)))}
    }
    else {
        return triangle( a, b, c );
    }
}


function tetrahedron(a, b, c, d, n) {
    const t1 = divideTriangle(a, b, c, n);
    const t2 = divideTriangle(d, c, b, n);
    const t3 = divideTriangle(a, d, b, n);
    const t4 = divideTriangle(a, c, d, n);
    return {"pointsArray": t1.pointsArray.concat(t2.pointsArray.concat(t3.pointsArray.concat(t4.pointsArray))), "normalsArray": t1.normalsArray.concat(t2.normalsArray.concat(t3.normalsArray.concat(t4.normalsArray)))}
}

function bars(factor) {
    let verts = [];
    if (factor !== 0) {
        verts.push(vec4(0.0, 1.0, 0.0, 1.0));
        verts.push(vec4(0.0, -1.0, 0.0, 1.0));
        verts.push(vec4(-4.0 * factor, -1.0, 0.0, 1.0));
        verts.push(vec4(4.0 * factor, -1.0, 0.0, 1.0));
    } else {
        verts.push(vec4(0.0, 1.0, 0.0, 1.0));
        verts.push(vec4(0.0, 0.0, 0.0, 1.0));
    }
    return verts;
}

function cube()
{
    var verts = [];
    verts = verts.concat(quad( 1, 0, 3, 2 ));
    verts = verts.concat(quad( 2, 3, 7, 6 ));
    verts = verts.concat(quad( 3, 0, 4, 7 ));
    verts = verts.concat(quad( 6, 5, 1, 2 ));
    verts = verts.concat(quad( 4, 5, 6, 7 ));
    verts = verts.concat(quad( 5, 4, 0, 1 ));
    return verts;
}

let alpha = 0;
function render()
{
    alpha += 1;
    let personalRot;

    pMatrix = perspective(fovy, aspect, .1, 20000);
    gl.uniformMatrix4fv( projection, false, flatten(pMatrix) );
    eye = vec3(0, 0, 30);
    mvMatrix = lookAt(eye, at , up);
    mvMatrix = mult(mvMatrix, rotateY(alpha));
    gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
    drawLines(topBars, color.BLACK);
    draw(mobileRoot.pointsArray, color.GREEN);
    stack.push(mvMatrix);
    {
        mvMatrix = mult(mvMatrix, mult(translate(2*spacing, spacing, 0), rotateY(-2*alpha)));
        gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
        drawLines(middleBars, color.BLACK);
        personalRot = mult(mvMatrix, rotateY(3*alpha));
        gl.uniformMatrix4fv(modelView, false, flatten(personalRot));
        draw(spheres.pointsArray, color.RED);
        stack.push(mvMatrix);
        {
            mvMatrix = mult(mvMatrix, mult(translate(spacing, spacing, 0), rotateY(3*alpha)));
            gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
            drawLines(bottomBars, color.BLACK);
            draw(cubes, color.MAGENTA);


        }
        mvMatrix = stack.pop();
        stack.push(mvMatrix);
        {
            mvMatrix = mult(mvMatrix, mult(translate(-spacing, spacing, 0), rotateY(3 * alpha)));
            gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
            drawLines(bottomBars, color.BLACK);
            draw(cubes, color.TEAL);
        }
        stack.pop();
    }
    mvMatrix = stack.pop();
    stack.push(mvMatrix);
    {
        mvMatrix = mult(mvMatrix, mult(translate(-2*spacing, spacing, 0), rotateY(-2*alpha)));
        gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
        drawLines(middleBars, color.BLACK);
        personalRot = mult(mvMatrix, rotateY(3*alpha));
        gl.uniformMatrix4fv(modelView, false, flatten(personalRot));
        draw(cubes, color.BLUE);
        stack.push(mvMatrix);
        {
            mvMatrix = mult(mvMatrix, mult(translate(spacing, spacing, 0), rotateY(3*alpha)));
            gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
            drawLines(bottomBars, color.BLACK);
            draw(spheres.pointsArray, color.BLACK);


        }
        mvMatrix = stack.pop();
        stack.push(mvMatrix);
        {
            mvMatrix = mult(mvMatrix, mult(translate(-spacing, spacing, 0), rotateY(3 * alpha)));
            gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
            drawLines(bottomBars, color.BLACK);
            draw(spheres.pointsArray, vec4(Math.random(), Math.random(), Math.random(), 1.0));
        }
        stack.pop();

    }
    mvMatrix = stack.pop();

    id = requestAnimationFrame(render)
}

function drawLines(points, color){
    let fragColors = [];
    for (let i = 0; i < points.length; i++) {
        fragColors.push(color);
    }

    const pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program,  "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(fragColors), gl.STATIC_DRAW);

    var vColor= gl.getAttribLocation(program,  "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.drawArrays( gl.LINE_STRIP, 0, points.length);


}

function draw(shape, color)
{
    var fragColors = [];

    for(var i = 0; i < shape.length; i++)
    {
        fragColors.push(color);
    }

    var pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(shape), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program,  "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(fragColors), gl.STATIC_DRAW);

    var vColor= gl.getAttribLocation(program,  "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.drawArrays( gl.TRIANGLES, 0, shape.length);

}


function quad(a, b, c, d)
{
    var verts = [];

    var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
    ];

    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i )
    {
        verts.push( vertices[indices[i]] );
    }

    return verts;
}
