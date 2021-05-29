import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,Texture
} = tiny;

const {Textured_Phong} = defs

const k = 0.3;
//let positionY = 7.7777;
const anchorY = 5;
//let mass = 1.38;//0.84,1,1.15,1.27,1.38
const gravity = 1;
//let velocityY = 0;
//let springForceY = 0;
//let forceY = 0;
//let accelerationY = 0;
//let d = 1/100;
const DAMPING=0.01;
const DAMPING2 = 0.2;
const TIME_STEPSIZE2 = 0.5*0.5;
const CONSTRAINT_ITERATIONS=15;


class particle
{
    constructor(pos)
    {
        this.pos = pos;
        this.old_pos = pos;
        this.acceleration=vec3(0,0,0);
        this.mass = 1;
        this.movable=true;
        this.accumulated_normal=vec3(0,0,0);
        this.ymovable = true;
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
    movehori(v){ if(this.ymovable) this.pos = this.pos.plus(v);}
    makeUnmovable() {this.movable = false;}
    //makeMovable(){this.movable = true;}
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
        this.p2.offsetPos(correctionVectorHalf.times(-1));//}

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
            this.getParticle(0 + i, 0).offsetPos(vec3(0.5, 0.0, 0.0)); // moving the particle a bit towards the center, to make it hang more natural
            this.getParticle(0 + i, 0).makeUnmovable();

            this.getParticle(num_particles_width - 1 - i, 0).offsetPos(vec3(0.5, 0.0, 0.0)); // moving the particle a bit towards the center, to make it hang more natural
            this.getParticle(num_particles_width- 1 - i, 0).makeUnmovable();
        }

        /*for (let i = 0 ;i < num_particles_width;i=i+6)
        {

            if(i===0)
            {
                for(let j=i;j<i+2;j++)
                {
                    this.getParticle(0 + j, 0).offsetPos(vec3(-0.15, 0.0, 0.0));
                    this.getParticle(0 + j, 0).makeUnmovable();
                }
            }
            else
            {
                for(let j=i;j<i+2;j++)
                {
                    this.getParticle(0 + j, 0).offsetPos(vec3(-0.15*(1+(i/6)), 0.0, 0.0));
                    this.getParticle(0 + j, 0).makeUnmovable();
                }
            }


        }*/


        for (let particle of this.particles) {
            particle.resetNormal();
        }
        for (let x = 0; x < num_particles_width - 1; x++) {
            for (let y = 0; y < num_particles_height - 1; y++) {

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

            }
        }
        //console.log(this.arrays.normal.length);


        for (let h = 0; h < (num_particles_height-1); h++) {
            // Generate a sequence like this (if #columns is 10):
            for (let i = 0; i < 2 * (num_particles_width-1); i++)    // "1 11 0  11 1 12  2 12 1  12 2 13  3 13 2  13 3 14  4 14 3..."
            {
                for (let j = 0; j < 3; j++) {
                    this.indices.push(h * ((num_particles_width-1) + 1) + (num_particles_width-1) * ((i + (j % 2)) % 2) + (~~((j % 3) / 2) ?
                        (~~(i / 2) + 2 * (i % 2)) : (~~(i / 2) + 1)));

                }5
            }

            //console.log(this.indices);

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
    let force = normal.times((d.dot(direction)));
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

    windForce(direction)
   {
    for(let x = 0; x<this.num_particles_width-1; x++)
    {
       for(let y=0; y<this.num_particles_height-1; y++)
       {
           this.addWindForcesForTriangle(this.getParticle(x+1,y),this.getParticle(x,y),this.getParticle(x,y+1),direction);
           this.addWindForcesForTriangle(this.getParticle(x+1,y+1),this.getParticle(x+1,y),this.getParticle(x,y+1),direction);
        }
    }
   }

   collision()
   {
       for(let p of this.particles)
       {
           if(p.getPos().z()<-4)
           {
               /*let d = (p.getPos().minus(p.old_pos)).normalized();
               //p.getPos().z()+d.times(-1).times(x).z() = -5
               let x = (-5-p.getPos().z())/d.times(-1).z();

               let n = vec3(0,0,1);
               let reflection = d.minus(n.times((d.dot(n))*2));
               p.offsetPos(reflection.normalized().times(x));
               console.log(p.getPos().z());*/

               //console.log(reflection);
               //p.offsetPos(vec(0,0,2));
               //console.log(p.getPos().z());
               //console.log(p.acceleration);
               //p.acceleration[2] = p.acceleration[2]+400*p.acceleration[2];
               //p.addForce(vec3(0,0,25));

           }
       }

   }
    open()
    {
        for (let i = 0 ;i < this.num_particles_width; i=i+6)
        {

            if(i===0)
            {

            }
            else
            {
                for(let j=i;j<i+2;j++)
                {
                    this.getParticle(0 + j, 0).movehori(vec3(-0.01*(1+(i/6)), 0.0, 0.0));
                }
            }

        }

    }
    close()
    {
        for (let i = 0 ;i < this.num_particles_width; i=i+6)
        {
            if(i!=1)
            {
                for(let j=i;j<i+2;j++)
                {
                    this.getParticle(0 + j, 0).movehori(vec3(0.01*(1+(i/6)), 0.0, 0.0));
                }
            }
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


            cloth: new cloth(13,11,50,45),

            spring:  new defs.Spring(15, 500),

            cube :new Cube(),
            cylinder: new defs.Capped_Cylinder (30,30),
            square: new defs.Square(),
            arrow: new defs.Arrow(),
            text: new Text_Line(35),
            wood:new  defs.Square(),
            wall: new defs.Square(),
            half_circle1: new defs.half_circle(15,15,12,2/3),//架子上的
            half_circle2: new defs.half_circle(15,15,10,2/3),//弹簧上的
            half_circle3: new defs.half_circle(15,15,24,1/4),//重物上的

        };
        for (let i=0; i < this.shapes.wood.arrays.texture_coord.length;i++)
        {
            this.shapes.wood.arrays.texture_coord[i].scale_by(3);
        }


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
                {ambient: .5, diffusivity: .6, specularity: 1, smoothness: 40, color: hex_color("#910101")}),
            phong3:new Material(new defs.Phong_Shader(),
                {ambient: .9, diffusivity: .2, specularity: 0, smoothness: 40, color: hex_color("#ddba8a")}),//#ddba8a
            gouraud: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, specularity: .8, smoothness: 40, color: hex_color("#fff53e")}),
            ring: new Material(new Ring_Shader()),

            phong2: new Material(new defs.Phong_Shader(),
                {ambient: .8, diffusivity: .5, specularity: 0, smoothness: 40, color: hex_color("#b9a081")}),

            leg: new Material (new defs.Phong_Shader(),
            {ambient: .9, diffusivity: .6, specularity: 1, color: hex_color ("#c0b284")}),
            paper: new Material (new defs.Phong_Shader(),
            {ambient: .9, diffusivity: .6, specularity: .1, color: hex_color ("#ffffff")}),
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
            wood1: new Material (new Textured_Phong(), {
                color: hex_color ("#000000"),
                ambient: 1.0, diffusivity: 0.1, specularity: 1,
                texture: new Texture("assets/wood_new_5.png")
            }),
            wall_texture: new Material (new Textured_Phong(), {
                color: hex_color ("#000000"),
                ambient: .9, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/Wallpaper_3.jpg")
            }),
            wall_texture2: new Material (new Textured_Phong(), {
                color: hex_color ("#000000"),
                ambient: .95, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/Wallpaper_3.jpg")
            }),
            window_texture: new Material (new Textured_Phong(), {
                color: hex_color ("#000000"),
                ambient: 1.0, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/window_view.png")
            }),

        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 2, 30), vec3(0, -0.2, 0), vec3(0, 4, 0));
        //this.attached = () => this.initial_camera_location;

        this.cloth_transform = Mat4.identity();
        this.cloth_transform  = this.cloth_transform.times(Mat4.translation(-9.8,7.7,-4.5)).times(Mat4.scale(0.57,0.65,1));
        //this.cloth_transform = this.cloth_transform.times(Mat4.translation(2.9, 9.45, -4.8,)).times(Mat4.scale(1.21,1.3,1));

        this.x = 1;
        this.open = false;
        this.close = false;
        this.log = 1.21;


        this.positionY = 7.7777;
        this.mass = 0.84;//0.84,1,1.15,1.27,1.38
        this.velocityY = 0;
        this.springForceY = 0;
        this.forceY = 0;
        this.accelerationY = 0;
        this.d = 1/100;

        this.weight1 = false;
        this.weight2 = false;
        this.weight3 = false;
        this.weight4 = false;

        this.loc_weight1 = vec3(0,0,0);
        this.loc_weight2 = vec3(0,0,0);
        this.loc_weight3 = vec3(0,0,0);
        this.r1 = 0.3;
        this.r2 = 0.7;
        this.r3 = 0.4;

        this.mouse_scene = new defs.Movement_Controls();


    }

        make_control_panel() {
            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
            this.key_triggered_button("View room", ["Control", "0"], () => this.attached =  undefined);
            this.new_line();
            this.key_triggered_button("Attach to spring", ["Control", "1"], () => this.attached = () => this.Spring);
            this.key_triggered_button("Attach to cloth", ["Control", "2"], () => this.attached = () => this.Cloth);
            this.new_line();
            this.key_triggered_button("Wind", ["w"], () => {
                this.open = true;
                //this.close = false;
            });
            /*this.key_triggered_button("close", ["c"], () => {
                this.close = true;
                this.open = false;
            });*/

            this.new_line();
            this.key_triggered_button("w1",  ["q"],() => {
                this.weight1 = !this.weight1;
                this.weight2 = false;
                this.weight3 = false;
                this.weight4 = false;
            });
            this.key_triggered_button("w2", ["e"], () => {
                this.weight1 = false;
                this.weight2 = true;
                this.weight3 = false;
                this.weight4 = false;
            });
            this.key_triggered_button("w3",  ["r"],() => {
                this.weight1 = false;
                this.weight2 = false;
                this.weight3 = true;
                this.weight4 = false;
            });
            this.key_triggered_button("w4",  ["t"],() => {
                this.weight1 = false;
                this.weight2 = false;
                this.weight3 = false;
                this.weight4 = true;
            });


        }

    get_ray (context,program_state,vec2_view) {
        let clip = vec4(vec2_view[0],vec2_view[1],-1.0,1.0);
        console.log(clip);
        let invProjec = Mat4.inverse(program_state.projection_transform);
        let eyeCoord = invProjec.times(clip);
        eyeCoord = vec4(eyeCoord[0],eyeCoord[1],-1.0,0.0);
        let cam_mat = program_state.camera_transform;
        let rayWorld = cam_mat.times(eyeCoord);
        let rayWorld_vec = rayWorld.to3();
        return rayWorld_vec;
    }

    intersection_ray_1 (context, program_state, rayIn) {
        let z_coord = this.loc_weight1[2] + this.r1;
        console.log(z_coord);
        let invView = program_state.camera_transform;
        let camera_position = vec3(invView[0][3], invView[1][3], invView[2][3]);

        let t = (z_coord - camera_position[2])/(rayIn[2]);
        let x_zplane = camera_position[0] + t*rayIn[0];
        let y_zplane = camera_position[1] + t*rayIn[1];
        console.log(vec4(x_zplane,y_zplane,z_coord,1.0));

        return vec4(x_zplane,y_zplane,z_coord,1.0);
    }

    drag_object1(context,program_state) {
        let model_transform = Mat4.identity();
        model_transform = model_transform.pre_multiply(Mat4.scale(this.r1,this.r1,this.r1)).pre_multiply(Mat4.translation(-2,-4.3,1));
        if (this.mouse_scene.movem) {
            let vec2_view = this.mouse_scene.mouse.anchor;
            let ray_anchor = this.get_ray(context,program_state,vec2_view);
            let intersect_anchor = this.intersection_ray_1(context,program_state,ray_anchor);
            console.log(intersect_anchor);
            let lambda = 0.05;
            if (intersect_anchor[0] >= this.loc_weight1[0] - this.r1 - lambda && 
                intersect_anchor[0] <= this.loc_weight1[0] + this.r1 + lambda &&
                intersect_anchor[1] >= this.loc_weight1[1] - this.r1 - lambda && 
                intersect_anchor[1] <= this.loc_weight1[1] + this.r1 + lambda) {
                    let ray_cur = this.get_ray(context,program_state,this.mouse_scene.mouse.from_center);
                    let intersect_cur = this.intersection_ray_1(context,program_state,ray_cur);
                    const x_diff = intersect_cur[0] - intersect_anchor[0];
                    const y_diff = intersect_cur[1] - intersect_anchor[1];
                    model_transform = model_transform.pre_multiply(Mat4.translation(x_diff,y_diff,0));
                    this.shapes.cube.draw(context,program_state,model_transform,this.materials.weight1);
                }
        }
        //else if (this.mouse_scene.freeze) {
            //let ray_cur = this.get_ray(context,program_state,this.mouse_scene.mouse.from_center);
            //let intersect_cur = this.intersection_ray_1(context,program_state,ray_cur);

        //}



        else {
            this.shapes.cube.draw(context,program_state,model_transform,this.materials.weight1);
            this.loc_weight1 = model_transform.times(vec(0,0,0,1));
            this.weight1 = false;
        }

 

    }



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


        this.shapes.cube.draw(context,program_state,plat_transform,this.materials.phong3);
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
        second_transform = second_transform.pre_multiply(Mat4.translation(12,6,-4.8));//-5,6,-4.8));

        let min_transform = Mat4.identity();
        min_transform = min_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,1,0));
        min_transform = min_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,0,1));
        min_transform = min_transform.pre_multiply(Mat4.scale(0.8,0.55,0.8));
        min_transform = min_transform.pre_multiply(Mat4.rotation(-angle_min,0,0,1));
        min_transform = min_transform.pre_multiply(Mat4.translation(12,6,-4.8));

        let h_transform = Mat4.identity();
        h_transform = h_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,1,0));
        h_transform = h_transform.pre_multiply(Mat4.rotation(Math.PI/2,0,0,1));
        h_transform = h_transform.pre_multiply(Mat4.scale(1,0.35,1));
        h_transform = h_transform.pre_multiply(Mat4.rotation(-angle_hr,0,0,1));
        h_transform = h_transform.pre_multiply(Mat4.translation(12,6,-4.8));

        let clock_transform = Mat4.identity();
        clock_transform = clock_transform.pre_multiply(Mat4.scale(1.8,1.8,0.3));
        clock_transform = clock_transform.pre_multiply(Mat4.translation(12,6,-5.1));


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

    draw_weight_1 (context,program_state,transform) {
        let model_transform = Mat4.identity();
        model_transform = transform.times(model_transform.pre_multiply(Mat4.scale(this.r1,this.r1,this.r1)).pre_multiply(Mat4.translation(-2,-4.3,1)));
        this.loc_weight1 = (model_transform.times(vec4(0,0,0,1))).xyz; 
        this.shapes.cube.draw(context,program_state,model_transform,this.materials.weight1);
        //let strings = ["2kg",Text_Line.toString(), Text_Line.toString()];
        //let cube_side = Mat4.translation(-0.3,0,1.1);
        //this.shapes.text.set_string("2kg", context.context);
        //this.shapes.text.draw(context, program_state, model_transform.times(cube_side).times(Mat4.scale(.15, .15, .15)), this.text_image);
    }

    draw_weight_2 (context,program_state) {
        let model_transform = Mat4.identity();
        model_transform = model_transform.pre_multiply(Mat4.scale(this.r2,this.r2,this.r2)).pre_multiply(Mat4.translation(-4,-4.1,1));
        this.loc_weight2 = (model_transform.times(vec4(0,0,0,1))).xyz; 
        this.shapes.cube.draw(context,program_state,model_transform,this.materials.weight1);
        //let strings = ["1.5kg",Text_Line.toString(), Text_Line.toString()];
        let cube_side = Mat4.translation(-0.5,0,1.1);
        this.shapes.text.set_string("2.5kg", context.context);
        this.shapes.text.draw(context, program_state, model_transform.times(cube_side).times(Mat4.scale(.2, .2, .2)), this.text_image);
    }

    draw_weight_3 (context,program_state) {
        let model_transform = Mat4.identity();
        model_transform = model_transform.pre_multiply(Mat4.scale(this.r3,this.r3,this.r3)).pre_multiply(Mat4.translation(-5.6,-4.4,1));
        this.shapes.cube.draw(context,program_state,model_transform,this.materials.weight1);
        this.loc_weight3 = (model_transform.times(vec4(0,0,0,1))).xyz; 
        //let strings = ["1.5kg",Text_Line.toString(), Text_Line.toString()];
        let cube_side = Mat4.translation(-0.28,0,1.1);
        this.shapes.text.set_string("1kg", context.context);
        this.shapes.text.draw(context, program_state, model_transform.times(cube_side).times(Mat4.scale(.3, .3, .3)), this.text_image);
    }

    draw_wall (context,program_state) {
        let back = Mat4.identity();
        back = back.pre_multiply (Mat4.scale(15,15,20)).pre_multiply(Mat4.translation(0,4,-5.3));
        this.shapes.wall.draw(context,program_state,back,this.materials.wall_texture2);//.paper);

        let floor = Mat4.identity();
        floor = floor.pre_multiply(Mat4.rotation(Math.PI/2,1,0,0)).pre_multiply(Mat4.scale(15,15,15))
        .pre_multiply(Mat4.translation(0,-10.1,0));
        this.shapes.wood.draw(context,program_state,floor,this.materials.wood1);

        let left = Mat4.identity();
        left = left.pre_multiply(Mat4.rotation(Math.PI/2,0,1,0)).pre_multiply(Mat4.scale(15,15,15))
        .pre_multiply(Mat4.translation(-15,0,0));
        this.shapes.wall.draw(context,program_state,left,this.materials.wall_texture);

        let right = Mat4.identity();
        right = right.pre_multiply(Mat4.rotation(Math.PI/2,0,1,0)).pre_multiply(Mat4.scale(15,15,15))
        .pre_multiply(Mat4.translation(15,0,0));
        this.shapes.wall.draw(context,program_state,right,this.materials.wall_texture);

        let window = Mat4.identity();
        window = window. pre_multiply(Mat4.scale(5,5,1)).pre_multiply(Mat4.translation(-6,4,-5.25));//6,6
        this.shapes.square.draw(context,program_state,window,this.materials.window_texture);      

    }


    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = this.mouse_scene);
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        program_state.set_camera(this.initial_camera_location);

        program_state.projection_transform = Mat4.perspective(
            Math.PI/4, context.width / context.height, .1, 1000);

        if (this.attached !== undefined) {
            let desired = Mat4.inverse(this.attached().times(Mat4.translation(0,0,-5)));
            program_state.set_camera(desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
        }
        else
        {
            let desired = this.initial_camera_location
            program_state.set_camera(desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
        }

        // TODO: Lighting (Requirement 2)
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        let model_transform_w1 = Mat4.identity();
        let half_circle_transform3 = Mat4.identity();//弹簧上的
        half_circle_transform3 = half_circle_transform3.times(Mat4.translation(2.9,8.85 - this.positionY,1)).times(Mat4.rotation((1/2+1/12) * Math.PI,0,1,0));
        let hook_transform1 = Mat4.identity();

        this.cloth_transform = this.cloth_transform.times(Mat4.scale(1,1,1));

        let spring_model_transform = Mat4.identity();
        spring_model_transform = spring_model_transform.times(Mat4.translation(2.94,3.76, 1.)).times(Mat4.rotation(1/12*Math.PI,0,1,0));//4.92
        this.Spring = Mat4.translation(30,12, -130);
        this.Cloth = Mat4.identity().times(Mat4.translation(-9.9,7.7,-4.8)).times(Mat4.scale(0.57,0.6,1)).times(Mat4.translation(-40,35, -140));


        if(!this.weight1 && !this.weight2 && !this.weight3 && !this.weight4)
        {
            this.mass = 0.84;
            model_transform_w1 = Mat4.identity();
            hook_transform1 = hook_transform1.times(Mat4.translation(-2,-4,1)).times(Mat4.scale(1,1,1)).times(Mat4.rotation(Math.PI,1,0,0));

        }
        else if (this.weight1)
        {
            this.mass = 1.38;
            model_transform_w1 = model_transform_w1.times(Mat4.translation(0,12 - this.positionY,0)).times(Mat4.translation(5,0,2));
            hook_transform1  =  hook_transform1.times(Mat4.translation(0,8 - this.positionY,0)).times(Mat4.translation(3,0,1)).times(Mat4.rotation(Math.PI,1,0,0));
            this.draw_weight_1(context,program_state,model_transform_w1);

        }

        this.springForceY = -k*(this.positionY - anchorY);
        this.forceY = this.springForceY + this.mass * gravity- DAMPING2 * this.velocityY;
        this.accelerationY = this.forceY/this.mass;

        this.velocityY = this.velocityY + this.accelerationY * 4*dt;
        this.positionY = this.positionY + this.velocityY * 4*dt;

        this.d = (this.positionY-anchorY)/ 500;


        this.draw_desk(context,program_state);
        this.draw_clock(context,program_state);
        this.draw_platform(context,program_state);



        this.drag_object1(context,program_state);
        
        //this.draw_weight_2(context,program_state);
        //this.draw_weight_3(context,program_state);
        this.draw_wall(context,program_state);

        this.shapes.spring.func(this.d);
        this.shapes.spring.draw(context, program_state, spring_model_transform, this.materials.phong);
        this.shapes.spring.copy_onto_graphics_card(context.context, ["position", "normal"], false);



        // this.shapes.spring.copy_onto_graphics_card(context.context, ["position", "normal"], false);

        //this.shapes.spring.override({dis:d}).draw(context, program_state, model_transform, this.materials.phong);

        //this.shapes.cloth.addforce(vec3(0,-0.2,0.02).times(TIME_STEPSIZE2));
        if(this.open)
        {
            this.shapes.cloth.addforce(vec3(0,-0.25,0.01).times(TIME_STEPSIZE2));
            this.shapes.cloth.windForce(vec3(0,0,1.1).times(TIME_STEPSIZE2));
        }
        else
        {
            this.shapes.cloth.addforce(vec3(0,-0.2,0.02).times(TIME_STEPSIZE2));
        }

        //this.shapes.cloth.collision();
        this.shapes.cloth.timestep();

        this.shapes.cloth.ddraw();

        this.shapes.cloth.draw(context, program_state, this.cloth_transform, this.materials.phong2);
        this.shapes.cloth.copy_onto_graphics_card(context.context, ["position", "normal"], false);
        let half_circle_transform1 = Mat4.identity().times(Mat4.translation(3,4.9, 1,));
        let half_circle_transform2 = Mat4.identity().times(Mat4.translation(3,3.7, 1,)).times(Mat4.rotation( (1/2+1/12) * Math.PI,0,1,0)).times(Mat4.rotation(Math.PI,1,0,0));

        this.shapes.half_circle1.draw(context, program_state, half_circle_transform1, this.materials.phong2);
        this.shapes.half_circle2.draw(context, program_state, half_circle_transform2, this.materials.phong);
        this.shapes.half_circle2.draw(context, program_state, half_circle_transform3, this.materials.phong);
        this.shapes.half_circle3.draw(context, program_state, hook_transform1, this.materials.phong);


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