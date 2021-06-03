# Report

### Group member: Sian Wen, Yunpu Liu 

### Project Introduction

In our project, we built a simple escape room. Users need to find the correct password to finish the game. Users will get the clues by looking at the poster and the pattern on the window as well as hanging four different weights on the spring.


<img src="/report/room.gif" width="600" height="326"/>    
<img src="/report/poster.png" width="600" height="332"/>     
<img src="/report/password.png" width="600" height="334"/>     
<img src="/report/congratulations.gif" width="600" height="334"/>  

### Advance features

1. Mouse picking （Sian Wen）

(i) Drag object


<img src="/report/drag.gif" width="400" height="300"/>  
(ii) Click object

Besides mouse dragging, we also enbale interactions via mouse clicking. For the 3 other weights, a user could attach and deattach the weight by clicking it.
<img src="/report/click_weight.gif" width="400" height="300"/> 

Once the user clicks the poster, he/she will have a better view of the poster. When the user clicks the screen again, the perspective would be set to the normal case. This is achieved by changing the look_at matrix. 
<img src="/report/poster_in.gif" width="488" height="300"/> 

Similarly, when the user clicks the window, the curtain will be blown up. When the user clicks the door, the passcode will be popped up. If the user then clicks any where except the passcode area, the passcode area will then be gone.

The user would input the passcode by clicking the numbers on the passcode area, and one shall end the passcode by clicking "#." 
<img src="/report/passcode_cl.gif" width="488" height="300"/> 


2. Physics based simulation  (Yunpu Liu) 

(i) Modeling the spring  

The spring shape is modeled as the surface generated by a circle sweeping around the z-axis in the path of a helix. So the Spring class is modified from the existing Grid patch class and the Surface of revolution class from Tiny graphics. The spring mass system is based on the equation F = -kx-cv = ma where c is the damping constant.   
<img src="/report/spring.gif" width="300" height="552"/>   
(ii) Cloth modeling    

We simulate cloth using particles. These particles are point masses. We model the deformation of cloth as particles held together by springs. The forces on each particle involve contributions due to pairwise interactions with some other particles close to it.  The particles are also subject to external forces, gravity and wind force. The force obeys Hooke’s law with a damping term.    

<img src="/report/cloth.png" width="400" height="279"/>   

### References

https://viscomp.alexandra.dk/?p=147   







