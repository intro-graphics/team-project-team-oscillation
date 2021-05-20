import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
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
const DAMPING=0.01;
const TIME_STEPSIZE2 = 0.5*0.5;
const CONSTRAINT_ITERATIONS=15;
class particle
{
    constructor(pos)
    {
        this.pos = pos;
        this.old_pos = pos;
        this.acceleration=vec3(0,0,0);
        this.mass=1;
        this.movable=true;
        this.accumulated_normal=vec3(0,0,0);
        //console.log(typeof (this.pos));
    }

    addForce(f)
    {
        this.acceleration = this.acceleration.plus(f.times(1/this.mass));
    }
   timeStep()
  {
    if(this.movable)
    {
        let temp = this.pos;
        this.pos = this.pos.plus((this.pos.minus(this.old_pos)).times((1.0-DAMPING))).plus(this.acceleration.times(TIME_STEPSIZE2));
        this.old_pos = temp;
        this.acceleration = vec3(0,0,0); // acceleration is reset since it HAS been translated into a change in position (and implicitely into velocity)
    }
  }
    getPos() {return this.pos;}
    resetAcceleration() {this.acceleration = vec3(0,0,0);}
    offsetPos(v) { if(this.movable) this.pos = this.pos.plus(v);}
    makeUnmovable() {this.movable = false;}
    addToNormal(normal)
    {
      this.accumulated_normal = this.accumulated_normal.plus(normal.normalized());
    }
    getNormal() { return this.accumulated_normal;}
    resetNormal() {this.accumulated_normal = vec3(0,0,0);}
}

class constraint
{
    constructor(p1,p2) {
        this.p1 = p1
        this.p2 = p2
        let vec = p1.getPos().minus(p2.getPos());
        this.rest_distance = vec.norm();
    }
    satisfyConstraint()
    {
        let p1_to_p2 = this.p2.getPos().minus(this.p1.getPos()); // vector from p1 to p2
        let current_distance = p1_to_p2.norm(); // current distance between p1 and p2
        let correctionVector = p1_to_p2.times((1 - this.rest_distance/current_distance)); // The offset vector that could moves p1 into a distance of rest_distance to p2
        let correctionVectorHalf = correctionVector.times(0.5); // Lets make it half that length, so that we can move BOTH p1 and p2.
        this.p1.offsetPos(correctionVectorHalf); // correctionVectorHalf is pointing from p1 to p2, so the length should move p1 half the length needed to satisfy the constraint.
        this.p2.offsetPos(correctionVectorHalf.times(-1));
    }

}


class cloth extends Shape {

    constructor(width,height,num_particles_width,num_particles_height) {
        super("position", "normal",);
        this.num_particles_width = num_particles_width;
        this.num_particles_height = num_particles_height;
        this.particles = [];
        this.constraints = [];


        for (let x = 0; x < this.num_particles_width; x++) {
            for (let y = 0; y < this.num_particles_height; y++) {
                let pos = vec3(width * (x / num_particles_width),
                    -height * (y / num_particles_height),
                    0);
                //console.log(pos);
                //this.particles[y*num_particles_width+x]= new particle(pos); // insert particle in column x at y'th row
                this.particles[y*num_particles_width+x] = new particle(pos);
                //console.log(new particle(pos));
                this.arrays.position[y*num_particles_width+x] = pos;
                //this.pr.push(pos);
            }
        }

        //console.log(this.arrays.position);

        // Connecting immediate neighbor particles with constraints (distance 1 and sqrt(2) in the grid)
        for (let x = 0; x < num_particles_width; x++) {
            for (let y = 0; y < num_particles_height; y++) {
                if (x < num_particles_width - 1) this.makeConstraint(this.getParticle(x, y), this.getParticle(x + 1, y));
                if (y < num_particles_height - 1) this.makeConstraint(this.getParticle(x, y), this.getParticle(x, y + 1));
                if (x < num_particles_width - 1 && y < num_particles_height - 1) this.makeConstraint(this.getParticle(x, y), this.getParticle(x + 1, y + 1));
                if (x < num_particles_width - 1 && y < num_particles_height - 1) this.makeConstraint(this.getParticle(x + 1, y), this.getParticle(x, y + 1));
            }
        }


        // Connecting secondary neighbors with constraints (distance 2 and sqrt(4) in the grid)
        for (let x = 0; x < num_particles_width; x++) {
            for (let y = 0; y < num_particles_height; y++) {
                if (x < num_particles_width - 2) this.makeConstraint(this.getParticle(x, y), this.getParticle(x + 2, y));
                if (y < num_particles_height - 2) this.makeConstraint(this.getParticle(x, y), this.getParticle(x, y + 2));
                if (x < num_particles_width - 2 && y < num_particles_height - 2) this.makeConstraint(this.getParticle(x, y), this.getParticle(x + 2, y + 2));
                if (x < num_particles_width - 2 && y < num_particles_height - 2) this.makeConstraint(this.getParticle(x + 2, y), this.getParticle(x, y + 2));
            }
        }

        // making the upper left most three and right most three particles unmovable
        for (let i = 0; i < 3; i++) {
            this.getParticle(0 + i, 0).offsetPos(vec3(0.5, 0.0, 0.0)); // moving the particle a bit towards the center, to make it hang more natural - because I like it ;)
            this.getParticle(0 + i, 0).makeUnmovable();

            this.getParticle(num_particles_width - 1 - i, 0).offsetPos(vec3(0.5, 0.0, 0.0)); // moving the particle a bit towards the center, to make it hang more natural - because I like it ;)
            this.getParticle(num_particles_width- 1 - i, 0).makeUnmovable();
        }
        for (let particle of this.particles) {
            particle.resetNormal();
        }
        for (let x = 0; x < num_particles_width - 1; x++) {
            for (let y = 0; y < num_particles_height - 1; y++) {
                //let d = this.getParticle(x + 1, y);
                //console.log(d);
                // d= this.getParticle(x,y);
                //d = this.getParticle(x+1,y+1);

                let normal = this.calcTriangleNormal(this.getParticle(x + 1, y), this.getParticle(x, y), this.getParticle(x, y + 1));
                this.getParticle(x + 1, y).addToNormal(normal);
                this.getParticle(x, y).addToNormal(normal);
                this.getParticle(x, y + 1).addToNormal(normal);

                normal = this.calcTriangleNormal(this.getParticle(x + 1, y + 1), this.getParticle(x + 1, y), this.getParticle(x, y + 1));
                this.getParticle(x + 1, y + 1).addToNormal(normal);
                this.getParticle(x + 1, y).addToNormal(normal);
                this.getParticle(x, y + 1).addToNormal(normal);
            }
        }


        for (let x = 0; x < this.num_particles_width; x++) {
            for (let y = 0; y < this.num_particles_height; y++) {
                //this.arrays.normal.push(this.getParticle(x, y).getNormal());
                this.arrays.normal[y*num_particles_width+x]= this.getParticle(x, y).getNormal();
                //this.nr.push(this.getParticle(x, y).getNormal());
            }
        }
        //console.log(this.arrays.normal.length);


        for (let h = 0; h < 44; h++) {
            // Generate a sequence like this (if #columns is 10):
            for (let i = 0; i < 2 * 54; i++)    // "1 11 0  11 1 12  2 12 1  12 2 13  3 13 2  13 3 14  4 14 3..."
            {
                for (let j = 0; j < 3; j++) {
                    this.indices.push(h * (54 + 1) + 54 * ((i + (j % 2)) % 2) + (~~((j % 3) / 2) ?
                        (~~(i / 2) + 2 * (i % 2)) : (~~(i / 2) + 1)));

                }5
            }

            console.log(this.indices);

        }
    }


    getParticle(x, y) {return this.particles[y*this.num_particles_width + x];}
    makeConstraint(p1, p2) {this.constraints.push(new constraint(p1,p2));}
    calcTriangleNormal(p1, p2, p3)
   {
    let pos1 = p1.getPos();
    let pos2 = p2.getPos();
    let pos3 = p3.getPos();
       //console.log(pos1);
    let v1 = pos2.minus(pos1);
    let v2 = pos3.minus(pos1);

    return v1.cross(v2);
   }
    addWindForcesForTriangle(p1,p2,p3, direction)
{
    let normal = this.calcTriangleNormal(p1,p2,p3);
    let d = normal.normalized();
    let force = normal*(d.dot(direction));
    p1.addForce(force);
    p2.addForce(force);
    p3.addForce(force);
}
    timestep()
    {
        for(let i=0; i<CONSTRAINT_ITERATIONS; i++) // iterate over all constraints several times
        {
            for( let x of this.constraints )
            {
                x.satisfyConstraint(); // satisfy constraint.
            }
        }

        for(let p of this.particles)
        {
            p.timeStep(); // calculate the position of each particle at the next time step.
        }
    }
    addforce(direction)
    {
        for(let p of this.particles)
        {
            p.addForce(direction); // calculate the position of each particle at the next time step.
        }
    }

    ddraw()
    {
        this.arrays.position=[];
        this.arrays.normal=[];
        for(let p of this.particles)
        {
            this.arrays.position.push(p.getPos());
        }

        for (let particle of this.particles) {
            particle.resetNormal();
        }
        for (let x = 0; x < this.num_particles_width - 1; x++) {
            for (let y = 0; y < this.num_particles_height - 1; y++) {

                let normal = this.calcTriangleNormal(this.getParticle(x + 1, y), this.getParticle(x, y), this.getParticle(x, y + 1));
                this.getParticle(x + 1, y).addToNormal(normal);
                this.getParticle(x, y).addToNormal(normal);
                this.getParticle(x, y + 1).addToNormal(normal);

                normal = this.calcTriangleNormal(this.getParticle(x + 1, y + 1), this.getParticle(x + 1, y), this.getParticle(x, y + 1));
                this.getParticle(x + 1, y + 1).addToNormal(normal);
                this.getParticle(x + 1, y).addToNormal(normal);
                this.getParticle(x, y + 1).addToNormal(normal);
            }
        }

        for (let x = 0; x < this.num_particles_width; x++) {
            for (let y = 0; y < this.num_particles_height; y++) {
                //this.arrays.normal.push(this.getParticle(x, y).getNormal());
                this.arrays.normal[y*this.num_particles_width+x]= this.getParticle(x, y).getNormal();
            }
        }
    }


}


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
            cloth: new cloth(14,10,55,45),
            //spring:  new defs.Spring(15, 500, 1/100),
            cube:new Cube()


        };

        // *** Materials
        this.materials = {
            // TODO:  Fill in as many additional material objects as needed in this key/value table.
            //        (Requirement 4)
            phong: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, specularity: 1, smoothness: 40, color: hex_color("#910101")}),
            gouraud: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, specularity: .8, smoothness: 40, color: hex_color("#fff53e")}),
            ring: new Material(new Ring_Shader()),
            phong2: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, specularity: 0, smoothness: 40, color: hex_color("#e18dfc")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
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

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        program_state.set_camera(this.attached());

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // TODO: Lighting (Requirement 2)
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();
        model_transform = model_transform.times(Mat4.translation(-5, 8, 0,))
        // model_transform = model_transform.times(Mat4.scale(2, 2, 2))


        springForceY = -k*(positionY - anchorY);
        forceY = springForceY + mass * gravity;
        accelerationY = forceY/mass;

        velocityY = velocityY + accelerationY * 4*dt;
        positionY = positionY + velocityY * 4*dt;
        //console.log(positionY);
        d = (positionY-anchorY)/ 500;


        //this.shapes.spring(d).draw(context, program_state, model_transform, this.materials.phong);

        // this.shapes.spring.copy_onto_graphics_card(context.context, ["position", "normal"], false);

        //this.shapes.spring.override({dis:d}).draw(context, program_state, model_transform, this.materials.phong);

        this.shapes.cloth.addforce(vec3(0,-0.2,0.1).times(TIME_STEPSIZE2));
        this.shapes.cloth.timestep();
        this.shapes.cloth.ddraw();



        //this.shapes.cube.draw(context, program_state, model_transform, this.materials.phong);
        this.shapes.cloth.draw(context, program_state, model_transform, this.materials.phong2);
        this.shapes.cloth.copy_onto_graphics_card(context.context, ["position", "normal"], false);


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