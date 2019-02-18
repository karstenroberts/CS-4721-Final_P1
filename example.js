var gl;

var fovy = 30.0;  // Field-of-view in Y direction angle (in degrees)
var aspect;       // Viewport aspect ratio
var program;
let personalRot;

var mvMatrix, pMatrix;
var modelView, projection;
var eye;

// View at and up vectors
const at = vec3(0.0, -2.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// Coords of starting tetrahedron for spheres
const va = vec4(0.0, 0.0, -1.0,1.5);
const vb = vec4(0.0, 0.942809, 0.333333, 1.5);
const vc = vec4(-0.816497, -0.471405, 0.333333, 1.5);
const vd = vec4(0.816497, -0.471405, 0.333333,1.5);

// Basic offset between shapes in mobile
const spacing = -2.0;

// Hierarchy stack
let stack = [];

// Generate sphere polygon only once (can be reused)
const spheres = tetrahedron(va, vb, vc, vd, 4);

// Generate cube only once
const cubes = cube();

// Generate pyramid only once (base case of circle)
const mobileRoot = tetrahedron(va, vb, vc, vd, 0);

// Light properties
var lightPosition = vec4(1.0, 5.0, 10.0, 0.0 );
var lightAmbient = vec4(0.4, 0.4, 0.4, 1.0 );
var lightDiffuse = vec4( .5, .5, .5, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

// Material properties
var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 5.0;

// Value for spotlight width, or similarity of face normal to light direction
let spotSim = .99;

// "P" was pressed
let spotIncrease = false;
// "p" was pressed
let spotDecrease = false;
// toggled by "M" or "m", vertex shading if false, face shading if true
let faceShading = false;

// Generate bar for top level
const topBars = bars(1);
// Generate bar for middle level
const middleBars = bars(.5);
// Generate bar for bottom level
const bottomBars = bars(0);

// Amount to deviate off of normal rotation
let alpha = 0;

// Available color options
const color = {
    "RED": vec4(1.0, 0.0, 0.0, 1.0),
    "BLUE":  vec4(0.0, 0.0, 1.0, 1.0),
    "MAGENTA": vec4(1.0, 0.0, 1.0, 1.0),
    "GREEN": vec4(0.0, 1.0, 0.0, 1.0),
    "TEAL": vec4(0.0, 0.7, 0.8, 1.0),
    "WHITE": vec4(1.0, 1.0, 1.0, 1.0),
    "BLACK": vec4(0.0, 0.0, 0.0, 1.0),
    "ORANGE": vec4(1,0.4,0.2)
};

/**
 * Handler for key down event
 * @param e event
 */
function keyDownHandler(e) {
    console.log(shiftDown);
  switch(e.key){
      case "m":
          faceShading = false;
          break;
      case "M":
          faceShading = true;
          break;
      case "p":
          spotDecrease = !spotDecrease;
          spotIncrease = false;
          break;
      case "P":
          spotIncrease = !spotIncrease;
          spotDecrease = false;
          break;
  }
}

/**
 * Called on body load, and only runs once. Sets up canvas, shaders, and lighting.
 */
function main()
{
    window.addEventListener("keydown", keyDownHandler, true);
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
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);


    const diffuseProduct = mult(lightDiffuse, materialDiffuse);
    const specularProduct = mult(lightSpecular, materialSpecular);
    const ambientProduct = mult(lightAmbient, materialAmbient);

    gl.uniform4fv(gl.getUniformLocation(program,
        "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program,
        "shininess"), materialShininess);

    projection = gl.getUniformLocation(program, "projectionMatrix");
    modelView = gl.getUniformLocation(program, "modelMatrix");

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    render();
}

/**********************************************************************************************************************
 * Following modified from Lighting Example code. Only change is that instead of saving to global list, returns a JSON
 * containing the list of points, list of vertex normals, and list of face normals. Also generates face normals.
 *********************************************************************************************************************/

function triangle(a, b, c) {
    let pointsArray = [];
    let vertexNormalsArray = [];

    pointsArray.push(c);
    pointsArray.push(b);
    pointsArray.push(a);

    // normals are vectors
    vertexNormalsArray.push(c[0],c[1], c[2], 0.0);
    vertexNormalsArray.push(b[0],b[1], b[2], 0.0);
    vertexNormalsArray.push(a[0],a[1], a[2], 0.0);


    const x = sum([pointsArray[0], pointsArray[1], pointsArray[2]], 0);
    const y = sum([pointsArray[0], pointsArray[1], pointsArray[2]], 1);
    const z = sum([pointsArray[0], pointsArray[1], pointsArray[2]], 2);
    const faceNormal = normalize([x, y, z, 0.0]);
    const faceNormalsArray = new Array(3).fill(faceNormal);
    return {"pointsArray": pointsArray, "vertexNormalsArray": vertexNormalsArray, "faceNormalsArray": faceNormalsArray}
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
        return {
            "pointsArray": t1.pointsArray.concat(t2.pointsArray.concat(t3.pointsArray.concat(t4.pointsArray))),
            "vertexNormalsArray": t1.vertexNormalsArray.concat(t2.vertexNormalsArray.concat(t3.vertexNormalsArray.concat(t4.vertexNormalsArray))),
            "faceNormalsArray": t1.faceNormalsArray.concat(t2.faceNormalsArray.concat(t3.faceNormalsArray.concat(t4.faceNormalsArray)))
        }
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
    return {
        "pointsArray": t1.pointsArray.concat(t2.pointsArray.concat(t3.pointsArray.concat(t4.pointsArray))),
        "vertexNormalsArray": t1.vertexNormalsArray.concat(t2.vertexNormalsArray.concat(t3.vertexNormalsArray.concat(t4.vertexNormalsArray))),
        "faceNormalsArray": t1.faceNormalsArray.concat(t2.faceNormalsArray.concat(t3.faceNormalsArray.concat(t4.faceNormalsArray)))
    }
}

/*********************************************************************************************************************
 *********************************************************************************************************************/


/**
 * Generates points for mobile frame
 * @param factor Width of crossbar. If zero, no crossbar.
 * @returns {Array} Array of points to draw
 */
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

/**********************************************************************************************************************
 * Following modified from Hierarchy Example code. Only changes are it calculates face and vertex normals, and instead
 * of saving to global list, returns a JSON containing the list of points, list of vertex normals, and list of face
 * normals.
 *********************************************************************************************************************/
function cube()
{
    var verts = [];
    let normals = [];
    let vertNormals = [];

    const q1 = quad( 1, 0, 3, 2 );
    const q2 = quad( 2, 3, 7, 6 );
    const q3 = quad( 3, 0, 4, 7 );
    const q4 = quad( 6, 5, 1, 2 );
    const q5 = quad( 4, 5, 6, 7 );
    const q6 = quad( 5, 4, 0, 1 );
    verts = verts.concat(q1.pointsArray);
    verts = verts.concat(q2.pointsArray);
    verts = verts.concat(q3.pointsArray);
    verts = verts.concat(q4.pointsArray);
    verts = verts.concat(q5.pointsArray);
    verts = verts.concat(q6.pointsArray);

    normals = normals.concat(q1.faceNormalsArray);
    normals = normals.concat(q2.faceNormalsArray);
    normals = normals.concat(q3.faceNormalsArray);
    normals = normals.concat(q4.faceNormalsArray);
    normals = normals.concat(q5.faceNormalsArray);
    normals = normals.concat(q6.faceNormalsArray);

    vertNormals = vertNormals.concat(q1.vertexNormalsArray);
    vertNormals = vertNormals.concat(q2.vertexNormalsArray);
    vertNormals = vertNormals.concat(q3.vertexNormalsArray);
    vertNormals = vertNormals.concat(q4.vertexNormalsArray);
    vertNormals = vertNormals.concat(q5.vertexNormalsArray);
    vertNormals = vertNormals.concat(q6.vertexNormalsArray);
    return {"pointsArray": verts, "faceNormalsArray": normals, "vertexNormalsArray": vertNormals};
}

function quad(a, b, c, d)
{
    var verts = [];
    let normals = [];
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
    const x = sum([vertices[indices[0]], vertices[indices[1]], vertices[indices[2]]], 0);
    const y = sum([vertices[indices[0]], vertices[indices[1]], vertices[indices[2]]], 1);
    const z = sum([vertices[indices[0]], vertices[indices[1]], vertices[indices[2]]], 2);
    const normal = normalize([x, y, z, 0.0]);

    for ( var i = 0; i < indices.length; ++i ) {
        verts.push( vertices[indices[i]] );
        normals.push(normal);
    }

    const vertexNormals = verts.map((e) => [e[0], e[1], e[2], 0.0]);

    return {"pointsArray": verts, "faceNormalsArray": normals, "vertexNormalsArray": vertexNormals}
}

/*********************************************************************************************************************
 *********************************************************************************************************************/

/**
 * Used to generate the face normals for spheres and cubes
 * @param poly Three points making up the face
 * @param ignore Which dimension to calculate
 * @returns {number} Returns the calculated dimension
 */
function sum(poly, ignore) {
    let totalSum = 0;
    if (ignore === 0) {
        totalSum += (poly[0][1] - poly[1][1])*(poly[0][2] + poly[1][2]);
        totalSum += (poly[1][1] - poly[2][1])*(poly[1][2] + poly[2][2]);
        totalSum += (poly[2][1] - poly[0][1])*(poly[2][2] + poly[0][2]);
    } else if (ignore === 1) {
        totalSum += (poly[0][2] - poly[1][2])*(poly[0][0] + poly[1][0]);
        totalSum += (poly[1][2] - poly[2][2])*(poly[1][0] + poly[2][0]);
        totalSum += (poly[2][2] - poly[0][2])*(poly[2][0] + poly[0][0]);
    } else if (ignore === 2) {
        totalSum += (poly[0][0] - poly[1][0])*(poly[0][1] + poly[1][1]);
        totalSum += (poly[1][0] - poly[2][0])*(poly[1][1] + poly[2][1]);
        totalSum += (poly[2][0] - poly[0][0])*(poly[2][1] + poly[0][1]);
    }
    return totalSum;
}

/**
 * Render method that is called every draw, modified from Hierarchy Example
 */
function render() {
    // increment alpha each render to animate
    alpha += .3;

    pMatrix = perspective(fovy, aspect, .1, 20000);
    gl.uniformMatrix4fv( projection, false, flatten(pMatrix) );
    eye = vec3(0, 0, 30);

    // Set up root transformations
    mvMatrix = lookAt(eye, at , up);
    mvMatrix = mult(mvMatrix, rotateY(alpha));
    gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));

    // Draw green pyramid and its bars
    draw(topBars, color.WHITE, false);
    draw(mobileRoot, color.GREEN, true);
    stack.push(mvMatrix); // Push root to stack
    {
        // Set up red sphere child transformations
        mvMatrix = mult(mvMatrix, mult(translate(2*spacing, spacing, 0), rotateY(-2*alpha)));
        gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
        draw(middleBars, color.WHITE, false);

        // Set up red sphere transformation (counterclockwise rotation)
        personalRot = mult(mvMatrix, rotateY(3*alpha));
        gl.uniformMatrix4fv(modelView, false, flatten(personalRot));
        draw(spheres, color.RED, true);
        stack.push(mvMatrix); // Push red to stack
        {
            // Set up cube rotation
            mvMatrix = mult(mvMatrix, mult(translate(spacing, spacing, 0), rotateY(3*alpha)));
            gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
            // Draw
            draw(bottomBars, color.WHITE, false);
            draw(cubes, color.MAGENTA, true);


        }
        mvMatrix = stack.pop(); // pop red from stack
        stack.push(mvMatrix); // push it back on to get value
        {
            // Set up cube rotation
            mvMatrix = mult(mvMatrix, mult(translate(-spacing, spacing, 0), rotateY(3 * alpha)));
            gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
            // Draw
            draw(bottomBars, color.WHITE, false);
            draw(cubes, color.TEAL, true);
        }
        stack.pop(); // Pop red from stack
    }
    mvMatrix = stack.pop(); //Pop root from stack
    stack.push(mvMatrix); // Push it back on to get value
    {
        // Set up blue cube child rotation
        mvMatrix = mult(mvMatrix, mult(translate(-2*spacing, spacing, 0), rotateY(-2*alpha)));
        gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
        draw(middleBars, color.WHITE, false);

        // Set up blue cube transformation (counterclockwise rotation)
        personalRot = mult(mvMatrix, rotateY(3*alpha));
        gl.uniformMatrix4fv(modelView, false, flatten(personalRot));
        draw(cubes, color.BLUE, true);
        stack.push(mvMatrix); // Push blue to stack
        {
            //Set up sphere rotation
            mvMatrix = mult(mvMatrix, mult(translate(spacing, spacing, 0), rotateY(3*alpha)));
            gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
            draw(bottomBars, color.WHITE, false);
            draw(spheres, vec4(Math.random(), Math.random(), Math.random(), 1.0), true);


        }
        mvMatrix = stack.pop(); // pop blue from stack
        stack.push(mvMatrix); // push it back on to get value
        {
            //Set up sphere rotation
            mvMatrix = mult(mvMatrix, mult(translate(-spacing, spacing, 0), rotateY(3 * alpha)));
            gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
            draw(bottomBars, color.WHITE, false);
            draw(spheres, color.ORANGE, true);
        }
        stack.pop();

    }
    mvMatrix = stack.pop();

    requestAnimationFrame(render)
}

/**
 * Draw given shape to the canvas
 * @param shape list of points or json info of shape
 * @param color what color to paint it
 * @param poly is it a polygon or a line
 */
function draw(shape, color, poly) {
    let normals = [];
    let shapePoints = [];
    if (poly) {
        shapePoints = shape.pointsArray;
        if (faceShading) {
            normals = shape.faceNormalsArray;
        } else {
            normals = shape.vertexNormalsArray;
        }
    } else {
        shapePoints = shape;
    }
    var fragColors = [];

    for(var i = 0; i < shapePoints.length; i++)
    {
        fragColors.push(color);
    }

    if (spotIncrease) {
        spotSim += alpha*.0000001;
    } else if(spotDecrease) {
        spotSim -= alpha*.0000001;
    }

    gl.uniform1f(gl.getUniformLocation(program,
        "spotSim"), spotSim);

    var pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(shapePoints), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program,  "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    if (poly) {
        var vBuffer2 = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer2);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

        var vNormal = gl.getAttribLocation(program, "vNormal");
        gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);
    }
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(fragColors), gl.STATIC_DRAW);

    var vColor= gl.getAttribLocation(program,  "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    if(poly) {
        gl.drawArrays(gl.TRIANGLES, 0, shapePoints.length);
    } else {
        gl.drawArrays( gl.LINE_STRIP, 0, shapePoints.length);
    }
}



