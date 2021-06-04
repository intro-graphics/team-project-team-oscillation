# Report

### Group member: Sian Wen, Yunpu Liu 

### Project Introduction

In our project, we built a simple escape room. Users need to find the correct password to finish the game. Users will get the clues by looking at the poster and the pattern on the window as well as hanging four different weights on the spring.


<img src="/report/room.gif" width="600" height="326"/>    
<img src="/report/poster.png" width="600" height="332"/>     
<img src="/report/password.png" width="600" height="334"/>     
<img src="/report/congratulations.gif" width="600" height="334"/>  

### Advanced features

1. Mouse picking （Sian Wen）

To enable mouse picking, we first cast a ray in the world space from the camera position to the corresponding world coordinate of the mouse location. Then, we calculate the intersection between the ray and the plane that contains the front surface of an object of interest. In the world space, we would check whether the intersection is within the object or not. 

(i) Drag object

In this project, we allow the user to drag the blue weight and attach it to the spring. Once we check that the user has clicked the blue weight, we would update the location of the weight by tracking the intersection between the ray that passes through the camera and the world coordinate of the mouse location and the plane that contains the front surface of the blue weight. Once the user releases the mouse, if the weight is near the end of the spring, the weight will then be attached to the spring, or it will return back to its original location.

<img src="/report/drag.gif" width="327" height="302"/>  
(ii) Click object

Besides mouse dragging, we also enbale interactions via mouse clicking. For the 3 other weights, a user could attach and deattach the weight by clicking it.

<img src="/report/click_weight.gif" width="327" height="302"/> 

Once the user clicks the poster, he/she will have a better view of the poster. When the user clicks the screen again, the perspective would be set to the normal case. This is achieved by changing the look_at matrix.     
<img src="/report/poster_in.gif" width="488" height="300"/> 

Similarly, when the user clicks the window, the curtain will be blown up. When the user clicks the door, the passcode will be popped up. If the user then clicks any where except the passcode area, the passcode area will then be gone. The user would input the passcode by clicking the numbers on the passcode area, and one shall end the passcode by clicking "#."     
<img src="/report/passcode_cl.gif" width="488" height="300"/> 


2. Physics based simulation  (Yunpu Liu) 

(i) Modeling the spring  

The spring shape is modeled as the surface generated by a circle sweeping around the z-axis in the path of a helix. So the Spring class is modified from the existing Grid patch class and the Surface of revolution class from Tiny graphics. The spring mass system is based on the equation F = -kx-cv = ma where c is the damping constant. The displacement x is calculated using explicit Euler method.  
![equation](https://latex.codecogs.com/gif.latex?v%28i&plus;1%29%20%3D%20v%28i%29&plus;a%28i%29%5CDelta%20t)    
![equation](https://latex.codecogs.com/gif.latex?x%28i&plus;1%29%20%3D%20x%28i%29&plus;v%28i%29%5CDelta%20t) 

<img src="/report/spring.gif" width="300" height="552"/>   
(ii) Cloth modeling    

We simulate cloth using particles. These particles are point masses. We model the deformation of cloth as particles held together by springs. The forces on each particle involve contributions due to pairwise interactions with some other particles close to it. There are three types of springs that connect the particles: structural(resist streching/compression), shear(resist shearing) and bend(resist bending). The particles are also subject to external forces, gravity and wind force. The force obeys Hooke’s law with a damping term.   
<img src="/report/cloth_particle.png" width="382" height="176"/> 

The displacement is calculated using Verlet intergration. 
Consider the Tayler expansion    
![equation](https://latex.codecogs.com/gif.latex?x%28t&plus;h%29%20%3D%20x%28t%29&plus;%20x%27%28t%29h%20&plus;%20%5Cfrac%7B1%7D%7B2%7Dx%27%27%28t%29h%5E2&plus;%5Cfrac%7B1%7D%7B6%7Dx%27%27%27%28t%29h%5E3&plus;O%28h%5E4%29%5C%5C)    
![equation](https://latex.codecogs.com/gif.latex?x%28t-h%29%20%3D%20x%28t%29-%20x%27%28t%29h%20&plus;%20%5Cfrac%7B1%7D%7B2%7Dx%27%27%28t%29h%5E2-%5Cfrac%7B1%7D%7B6%7Dx%27%27%27%28t%29h%5E3&plus;O%28h%5E4%29)   
Add these two together, we have    
![equation](https://latex.codecogs.com/gif.latex?x%28t&plus;h%29%20%3D%202x%28t%29-x%28t-h%29&plus;t%5E2x%27%27%28t%29&plus;O%28h%5E4%29)   
Thus we can calculate x(i+1) using   
![equation](https://latex.codecogs.com/gif.latex?x%28i&plus;1%29%20%3D%202x%28i%29-x%28i-1%29&plus;h%5E2a%28i%29)    
Then we add the damping term, the equation becomes    
![equation](https://latex.codecogs.com/gif.latex?x%28i&plus;1%29%20%3D%20x%28i%29&plus;%281-damping%29%28x%28i%29-x%28i-1%29%29&plus;h%5E2a%28i%29)  


<img src="/report/cloth.png" width="400" height="279"/>   

### References

https://viscomp.alexandra.dk/?p=147    
https://www.scss.tcd.ie/~manzkem/CS7057/cs7057-1516-14-MassSpringSystems-mm.pdf  







