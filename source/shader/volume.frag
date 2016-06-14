#version 150
//#extension GL_ARB_shading_language_420pack : require
#extension GL_ARB_explicit_attrib_location : require

#define TASK 10
#define ENABLE_OPACITY_CORRECTION 0
#define ENABLE_LIGHTNING 0
#define ENABLE_SHADOWING 0

in vec3 ray_entry_position;

layout(location = 0) out vec4 FragColor;

uniform mat4 Modelview;

uniform sampler3D volume_texture;
uniform sampler2D transfer_texture;


uniform vec3    camera_location;
uniform float   sampling_distance;
uniform float   sampling_distance_ref;
uniform float   iso_value;
uniform vec3    max_bounds;
uniform ivec3   volume_dimensions;

uniform vec3    light_position;
uniform vec3    light_ambient_color;
uniform vec3    light_diffuse_color;
uniform vec3    light_specular_color;
uniform float   light_ref_coef;


bool
inside_volume_bounds(const in vec3 sampling_position)
{
    return (   all(greaterThanEqual(sampling_position, vec3(0.0)))
            && all(lessThanEqual(sampling_position, max_bounds)));
}


float
get_sample_data(vec3 in_sampling_pos)
{
    vec3 obj_to_tex = vec3(1.0) / max_bounds;
    return texture(volume_texture, in_sampling_pos * obj_to_tex).r;

}

vec3
get_gradient(vec3 sampling_pos){
    float offset = 0.005;
    vec3 gradient;
    gradient.x = get_sample_data(vec3(sampling_pos.x+offset, sampling_pos.y, sampling_pos.z))-get_sample_data(vec3(sampling_pos.x-offset, sampling_pos.y, sampling_pos.z));
    gradient.y = get_sample_data(vec3(sampling_pos.x, sampling_pos.y+offset, sampling_pos.z))-get_sample_data(vec3(sampling_pos.x, sampling_pos.y-offset, sampling_pos.z));
    gradient.z = get_sample_data(vec3(sampling_pos.x, sampling_pos.y, sampling_pos.z+offset))-get_sample_data(vec3(sampling_pos.x, sampling_pos.y, sampling_pos.z-offset));
    return gradient;

}

void main()
{
    /// One step trough the volume
    vec3 ray_increment      = normalize(ray_entry_position - camera_location) * sampling_distance;
    /// Position in Volume
    vec3 sampling_pos       = ray_entry_position + ray_increment; // test, increment just to be sure we are in the volume

    /// Init color of fragment
    vec4 dst = vec4(0.0, 0.0, 0.0, 0.0);

    /// check if we are inside volume
    bool inside_volume = inside_volume_bounds(sampling_pos);
    
    if (!inside_volume)
        discard;

#if TASK == 10
    vec4 max_val = vec4(0.0, 0.0, 0.0, 0.0);
    
    // the traversal loop,
    // termination when the sampling position is outside volume boundarys
    // another termination condition for early ray termination is added
    while (inside_volume) 
    {      
        // get sample
        float s = get_sample_data(sampling_pos);
                
        // apply the transfer functions to retrieve color and opacity
        vec4 color = texture(transfer_texture, vec2(s, s));
           
        // this is the example for maximum intensity projection
        max_val.r = max(color.r, max_val.r);
        max_val.g = max(color.g, max_val.g);
        max_val.b = max(color.b, max_val.b);
        max_val.a = max(color.a, max_val.a);
        
        // increment the ray sampling position
        sampling_pos  += ray_increment;

        // update the loop termination condition
        inside_volume  = inside_volume_bounds(sampling_pos);
    }

    dst = max_val;
#endif 
    
#if TASK == 11
    vec4 summed_val = vec4(0.0, 0.0, 0.0, 0.0);
    int increase_count  = 0;
    // the traversal loop,
    // termination when the sampling position is outside volume boundarys
    // another termination condition for early ray termination is added
    while (inside_volume)
    {      
        // get sample
        float s = get_sample_data(sampling_pos);
        vec4 val = texture(transfer_texture, vec2(s, s));

        // summed value updating
        summed_val.r += val.r; 
        summed_val.g += val.g;
        summed_val.b += val.b;
        summed_val.a += val.a;
        
        // increment the ray sampling position
        sampling_pos  += ray_increment;

        //incrementing
        increase_count += 1;

        // update the loop termination condition
        inside_volume  = inside_volume_bounds(sampling_pos);
    }
    dst = summed_val/increase_count;
#endif
    
#if TASK == 12 || TASK == 13
    // the traversal loop,
    // termination when the sampling position is outside volume boundarys
    // another termination condition for early ray termination is added
    while (inside_volume)
    {
        // get sample
        float s = get_sample_data(sampling_pos);

        // first-hit inaccurate
        if (s > iso_value)
        {
            vec4 color = texture(transfer_texture, vec2(s, s));
            dst = color;

            vec3 mid_pos = sampling_pos;

#if TASK == 13 // Binary Search
        int spacing = 30;
        int increase_count = 0;
        vec3 pre_pos = sampling_pos-ray_increment;
        float mid_val=0.0;

        while(increase_count<spacing)
        {
            increase_count++;
            mid_pos = (sampling_pos + pre_pos)/2;
            mid_val = get_sample_data(mid_pos);

            if (get_sample_data(mid_pos)>iso_value){
                sampling_pos = mid_pos;
            }
            else if(get_sample_data(mid_pos)<iso_value){
                pre_pos = mid_pos;
            }
        }
        color = texture(transfer_texture, vec2(mid_val, mid_val));
        dst = color;
#endif
#if ENABLE_LIGHTNING == 1 // Add Shading
        //dummy
#endif

#if ENABLE_SHADOWING == 1 // Add Shadows
        //dummy
#endif 
break;
}

// increment the ray sampling position
        sampling_pos += ray_increment;

// update the loop termination condition
        inside_volume = inside_volume_bounds(sampling_pos);
    }
#endif


#if TASK == 31
    // the traversal loop,
    // termination when the sampling position is outside volume boundarys
    // another termination condition for early ray termination is added
    while (inside_volume)
    {
        // get sample
#if ENABLE_OPACITY_CORRECTION == 1 // Opacity Correction
        IMPLEMENT;
#else
        float s = get_sample_data(sampling_pos);
#endif
        // dummy code
        dst = vec4(light_specular_color, 1.0);

        // increment the ray sampling position
        sampling_pos += ray_increment;

#if ENABLE_LIGHTNING == 1 // Add Shading
        IMPLEMENT;
#endif

        // update the loop termination condition
        inside_volume = inside_volume_bounds(sampling_pos);
    }
#endif 

    // return the calculated color value
    FragColor = dst;
}

