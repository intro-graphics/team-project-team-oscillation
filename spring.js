import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,Texture
} = tiny;

let k = 1;
let positionY = 10;
let anchorY = 5;
let mass = 6;
let gravity = 1;
let velocityY = 0;
let springForceY = 0;
let forceY = 0;
let accelerationY = 0;
let d = 1/100;


class Cube extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, 1, 1], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, 1], [1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}

class Text_Line extends Shape {                           // **Text_Line** embeds text in the 3D world, using a crude texture
                                                                 // method.  This Shape is made of a horizontal arrangement of quads.
                                                                 // Each is textured over with images of ASCII characters, spelling
                                                                 // out a string.  Usage:  Instantiate the Shape with the desired
                                                                 // character line width.  Then assign it a single-line string by calling
                                                                 // set_string("your string") on it. Draw the shape on a material
                                                                 // with full ambient weight, and text.png assigned as its texture
                                                                 // file.  For multi-line strings, repeat this process and draw with
                                                                 // a different matrix.
    constructor(max_size) {
        super("position", "normal", "texture_coord");
        this.max_size = max_size;
        var object_transform = Mat4.identity();
        for (var i = 0; i < max_size; i++) {                                       // Each quad is a separate Square instance:
            defs.Square.insert_transformed_copy_into(this, [], object_transform);
            object_transform.post_multiply(Mat4.translation(1.5, 0, 0));
        }
    }

    set_string(line, context) {           // set_string():  Call this to overwrite the texture coordinates buffer with new
        // values per quad, which enclose each of the string's characters.
        this.arrays.texture_coord = [];
        for (var i = 0; i < this.max_size; i++) {
            var row = Math.floor((i < line.length ? line.charCodeAt(i) : ' '.charCodeAt()) / 16),
                col = Math.floor((i < line.length ? line.charCodeAt(i) : ' '.charCodeAt()) % 16);

            var skip = 3, size = 32, sizefloor = size - skip;
            var dim = size * 16,
                left = (col * size + skip) / dim, top = (row * size + skip) / dim,
                right = (col * size + sizefloor) / dim, bottom = (row * size + sizefloor + 5) / dim;

            this.arrays.texture_coord.push(...Vector.cast([left, 1 - bottom], [right, 1 - bottom],
                [left, 1 - top], [right, 1 - top]));
        }
        if (!this.existing) {
            this.copy_onto_graphics_card(context);
            this.existing = true;
        } else
            this.copy_onto_graphics_card(context, ["texture_coord"], false);
    }
}


export class Spring_Scene extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            sphere1: new defs.Subdivision_Sphere(3),
            sphere2: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),
            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)
            circle: new defs.Regular_2D_Polygon(1, 15),
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(35, 325),

            spring: (x) => new defs.Spring(15, 500, x),
            //spring:  new defs.Spring(15, 500, 1/100),
            cube :new Cube(),
            cylinder: new defs.Capped_Cylinder (30,30),
            square: new defs.Square(),
            arrow: new defs.Arrow(),
            text: new Text_Line(35),
        };

        const texture = new defs.Textured_Phong(1);
        this.text_image = new Material(texture, {
            ambient: 1, diffusivity: 0, specularity: 0,
            texture: new Texture("assets/text.png")
        });

        // *** Materials
        this.materials = {
            // TODO:  Fill in as many additional material objects as needed in this key/value table.
            //        (Requirement 4)
            phong: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, specularity: 1, smoothness: 40, color: hex_color("#910101")}),
            gouraud: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, specularity: .8, smoothness: 40, color: hex_color("#fff53e")}),
            ring: new Material(new Ring_Shader()),
            leg: new Material (new defs.Phong_Shader(),
            {ambient: .4, diffusivity: .6, specularity: .1, color: hex_color ("#c4cace")}),
            paper: new Material (new defs.Phong_Shader(),
            {ambient: .6, diffusivity: .6, specularity: .1, color: hex_color ("#ffffff")}),
            second: new Material (new defs.Phong_Shader(),
            {ambient: .6, diffusivity: .6, specularity: .1, color: hex_color ("#d1642e")}),
            minute: new Material (new defs.Phong_Shader(),
            {ambient: .6, diffusivity: .6, specularity: .1, color: hex_color ("#000000")}),
            hour: new Material (new defs.Phong_Shader(),
            {ambient: .6, diffusivity: .6, specularity: .1, color: hex_color ("#326ba8")}),
            clock: new Material (new defs.Phong_Shader(),
            {ambient:.5,diffusivity:.6, specularity: .1, color: hex_color ("#C0C0C0")}),
            weight1: new Material (new defs.Phong_Shader(),
            {ambient:.3,diffusivity:.6,specularity:.1,color: hex_color ("#6e9fd4")}),


        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 2, 22), vec3(0, -0.2, 0), vec3(0, 4, 0));
        this.attached = () => this.initial_camera_location;



    }
    /*
        make_control_panel() {
            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
            this.key_triggered_button("View solar system", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
            this.new_line();
            this.key_triggered_button("Attach to planet 1", ["Control", "1"], () => this.attached = () => this.planet_1);
            this.key_triggered_button("Attach to planet 2", ["Control", "2"], () => this.attached = () => this.planet_2);
            this.new_line();
            this.key_triggered_button("Attach to planet 3", ["Control", "3"], () => this.attached = () => this.planet_3);
            this.key_triggered_button("Attach to planet 4", ["Control", "4"], () => this.attached = () => this.planet_4);
            this.new_line();
            this.key_triggered_button("Attach to moon", ["Control", "m"], () => this.attached = () => this.moon);
        }*/

    draw_desk (context,program_state) {
        let plat_transform = Mat4.identity();
        plat_transform = plat_transform.pre_multiply(Mat4.scale(8,0.2,4));
        plat_transform = plat_transform.pre_multiply (Mat4.translation(0,-5,0));
        let leg_1 = Mat4.identity();
        leg_1 = leg_1.pre_multiply(Mat4.rotation(Math.PI/2,1,0,0));
        leg_1 = leg_1.pre_multiply (Mat4.scale(0.2,5,0.2));
        leg_1 = leg_1.pre_multiply (Mat4.translation(-7.8,-7.5,-3.8));

        let leg_2 = Mat4.identity();
        leg_2 = leg_2.pre_multiply(Mat4.rotation(Math.PI/2,1,0,0));
        leg_2 = leg_2.pre_multiply (Mat4.scale(0.2,5,0.2));
        leg_2 = leg_2.pre_multiply (Mat4.translation(-7.8,-7.5,3.8));

        let leg_3 = Mat4.identity();
        leg_3 = leg_3.pre_multiply(Mat4.rotation(Math.PI/2,1,0,0));
        leg_3 = leg_3.pre_multiply (Mat4.scale(0.2,5,0.2));
        leg_3 = leg_3.pre_multiply (Mat4.translation(7.8,-7.5,-3.8));

        let leg_4 = Mat4.identity();
        leg_4 = leg_4.pre_multiply(Mat4.rotation(Math.PI/2,1,0,0));
        leg_4 = leg_4.pre_multiply (Mat4.scale(0.2,5,0.2));
        leg_4 = leg_4.pre_multiply (Mat4.translation(7.8,-7.5,3.8));


        this.shapes.cube.draw(context,program_state,plat_transform,this.materials.phong);
        this.shapes.cylinder.draw(context,program_state,leg_1,this.materials.leg);
        this.shapes.cylinder.draw(context,program_state,leg_2,this.materials.leg);
        this.shapes.cylinder.draw(context,program_state,leg_3,this.materials.leg);
        this.shapes.cylinder.draw(context,program_state,leg_4,this.materials.leg);

        let paper_t = Mat4.identity();
        paper_t = paper_t.pre_multiply (Mat4.rotation(Math.PI/2,1,0,0));
        paper_t = paper_t.pre_multiply (Mat4.scale(0.8,1,1));
        paper_t = paper_t.pre_multiply (Mat4.rotation (Math.PI/10,0,1,0));
        paper_t = paper_t.pre_multiply (Mat4.translation(-7.2,-4.79,-2));
        this.shapes.square.draw(context,program_state,paper_t,this.materials.paper);

        let paper_2 = Mat4.identity();
        paper_2 = paper_2.pre_multiply (Mat4.rotation(Math.PI/2,1,0,0));
        paper_2 = paper_2.pre_multiply (Mat4.scale(0.8,1,1));
        paper_2 = paper_2.pre_multiply (Mat4.rotation (-Math.PI/15,0,1,0));
        paper_2 = paper_2.pre_multiply (Mat4.translation(-7.0,-4.79,-2));
        this.shapes.square.draw(context,program_state,paper_2,this.materials.paper);

        let paper_3 = Mat4.identity();
        paper_3 = paper_3.pre_multiply (Mat4.rotation(Math.PI/2,1,0,0));
        paper_3 = paper_3.pre_multiply (Mat4.scale(0.8,1,1));
        paper_3 = paper_3.pre_multiply (Mat4.rotation (-Math.PI/20,0,1,0));
        paper_3 = paper_3.pre_multiply (Mat4.translation(1,-4.79,2));
        this.shapes.square.draw(context,program_state,paper_3,this.materials.paper);
    }

    draw_clock (context,program_state) {
        const t = program_state.animation_time/1000;
        const angle_sec = Math.PI/10*t;
        const angle_min = Math.PI/200*t;
        const angle_hr = Math.PI/2400*t;

        let second_transform = Mat4.identity();
        second_transform = second_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,1,0));
        second_transform = second_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,0,1));
        second_transform = second_transform.pre_multiply(Mat4.scale(0.6,0.7,0.6));
        second_transform = second_transform.pre_multiply(Mat4.rotation(-angle_sec,0,0,1));
        second_transform = second_transform.pre_multiply(Mat4.translation(-5,6,-3.8));

        let min_transform = Mat4.identity();
        min_transform = min_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,1,0));
        min_transform = min_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,0,1));
        min_transform = min_transform.pre_multiply(Mat4.scale(0.8,0.55,0.8));
        min_transform = min_transform.pre_multiply(Mat4.rotation(-angle_min,0,0,1));
        min_transform = min_transform.pre_multiply(Mat4.translation(-5,6,-3.8));

        let h_transform = Mat4.identity();
        h_transform = h_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,1,0));
        h_transform = h_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,0,1));
        h_transform = h_transform.pre_multiply(Mat4.scale(1,0.35,1));
        h_transform = h_transform.pre_multiply(Mat4.rotation(-angle_hr,0,0,1));
        h_transform = h_transform.pre_multiply(Mat4.translation(-5,6,-3.8));

        let clock_transform = Mat4.identity();
        clock_transform = clock_transform.pre_multiply(Mat4.scale(1.8,1.8,0.3));
        clock_transform = clock_transform.pre_multiply(Mat4.translation(-5,6,-4.1));


        this.shapes.cylinder.draw(context,program_state,clock_transform,this.materials.clock);
        this.shapes.arrow.draw(context,program_state,second_transform,this.materials.second);
        this.shapes.arrow.draw(context,program_state,min_transform,this.materials.minute);
        this.shapes.arrow.draw(context,program_state,h_transform,this.materials.hour);

    }

    draw_platform(context,program_state) {
        let base_transform = Mat4.identity();
        base_transform = base_transform.pre_multiply(Mat4.scale(1,0.2,0.5)).pre_multiply(Mat4.translation(5,-4.85,1));
        let mid_transform = Mat4.identity();
        mid_transform = mid_transform.pre_multiply(Mat4.rotation(Math.PI/2,1,0,0)).pre_multiply(Mat4.scale(0.1,10,0.1));
        mid_transform = mid_transform.pre_multiply(Mat4.translation(4.7,0.2,1));
        let stretch = Mat4.identity();
        stretch = stretch.pre_multiply(Mat4.rotation(Math.PI/2,0,1,0)).pre_multiply(Mat4.scale(3,0.1,0.1));
        stretch = stretch.pre_multiply(Mat4.translation(3.4,5,1));
        this.shapes.cube.draw(context,program_state,base_transform,this.materials.second);
        this.shapes.cylinder.draw(context,program_state,mid_transform,this.materials.hour);
        this.shapes.cylinder.draw(context,program_state,stretch,this.materials.hour);



    }

    draw_weight_1 (context,program_state) {
        let model_transform = Mat4.identity();
        model_transform = model_transform.pre_multiply(Mat4.scale(0.5,0.5,0.5)).pre_multiply(Mat4.translation(-2,-4.3,-1));
        this.shapes.cube.draw(context,program_state,model_transform,this.materials.weight1);
        let strings = ["2kg",Text_Line.toString(), Text_Line.toString()];
        let cube_side = Mat4.translation(-0.3,0,1.1);
        this.shapes.text.set_string("2kg", context.context);
        this.shapes.text.draw(context, program_state, model_transform.times(cube_side).times(Mat4.scale(.2, .2, .2)), this.text_image);
    }

    draw_weight_2 (context,program_state) {
        let model_transform = Mat4.identity();
        model_transform = model_transform.pre_multiply(Mat4.scale(0.7,0.7,0.7)).pre_multiply(Mat4.translation(-4,-4.1,-0.6));
        this.shapes.cube.draw(context,program_state,model_transform,this.materials.weight1);
        //let strings = ["1.5kg",Text_Line.toString(), Text_Line.toString()];
        let cube_side = Mat4.translation(-0.5,0,1.1);
        this.shapes.text.set_string("2.5kg", context.context);
        this.shapes.text.draw(context, program_state, model_transform.times(cube_side).times(Mat4.scale(.2, .2, .2)), this.text_image);
    }

    draw_weight_3 (context,program_state) {
        let model_transform = Mat4.identity();
        model_transform = model_transform.pre_multiply(Mat4.scale(0.4,0.4,0.4)).pre_multiply(Mat4.translation(-5.6,-4.4,0.8));
        this.shapes.cube.draw(context,program_state,model_transform,this.materials.weight1);
        //let strings = ["1.5kg",Text_Line.toString(), Text_Line.toString()];
        let cube_side = Mat4.translation(-0.28,0,1.1);
        this.shapes.text.set_string("1kg", context.context);
        this.shapes.text.draw(context, program_state, model_transform.times(cube_side).times(Mat4.scale(.3, .3, .3)), this.text_image);
    }

    draw_wall (context,program_state) {
        let back = Mat4.identity();
        back = back.pre_multiply (Mat4.scale(15,15,20)).pre_multiply(Mat4.translation(0,6,-4));
        this.shapes.square.draw(context,program_state,back,this.materials.paper);
    }


    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        program_state.set_camera(this.initial_camera_location);

        program_state.projection_transform = Mat4.perspective(
            Math.PI/4, context.width / context.height, .1, 1000);

        // TODO: Lighting (Requirement 2)
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();
        model_transform = model_transform.times(Mat4.translation(0, 5, 0,))
        // model_transform = model_transform.times(Mat4.scale(2, 2, 2))


        springForceY = -k*(positionY - anchorY);
        forceY = springForceY + mass * gravity;
        accelerationY = forceY/mass;

        velocityY = velocityY + accelerationY * 4*dt;
        positionY = positionY + velocityY * 4*dt;
        //console.log(positionY);
        d = (positionY-anchorY)/ 500;

        this.draw_desk(context,program_state);
        this.draw_clock(context,program_state);
        this.draw_platform(context,program_state);
        this.draw_weight_1(context,program_state);
        this.draw_weight_2(context,program_state);
        this.draw_weight_3(context,program_state);
        this.draw_wall(context,program_state);


        //this.shapes.spring(d).draw(context, program_state, model_transform, this.materials.phong);

        // this.shapes.spring.copy_onto_graphics_card(context.context, ["position", "normal"], false);

        //this.shapes.spring.override({dis:d}).draw(context, program_state, model_transform, this.materials.phong);
    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the shaders coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;
        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );
                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            varying vec3 color;
            void main(){
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4(position, 1.0);
                // The final normal vector in screen space.
                N = normalize(mat3(model_transform) * normal / squared_scale);
                vertex_worldspace = (model_transform * vec4(position, 1.0)).xyz;
                color = phong_model_lights( normalize( N ), vertex_worldspace );
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            varying vec3 color;
            void main(){
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += color;
            }`;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        
        void main(){
            gl_Position = projection_camera_model_transform * vec4(position, 1.0 );
            center = model_transform * vec4(0., 0., 0., 1.);
            point_position = model_transform * vec4(position, 1.0);
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
            float c = mod(floor(point_position.x) + floor(point_position.y), 2.);
            float d = length(point_position.xyz - center.xyz);
            float v = (sin(d * 30.) + 1.) /2.;
            gl_FragColor = vec4(c, c, c, 1.);
        }`;
    }
}