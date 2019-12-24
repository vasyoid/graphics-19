set(CMAKE_CXX_STANDARD 17)

project(ray_marching)
add_executable(ray_marching main.cpp readpng.h readpng.cpp)

find_package(OpenGL REQUIRED)
find_package(GLUT REQUIRED)
find_package(GLEW REQUIRED)
find_package(PNG REQUIRED)

include_directories( ${OPENGL_INCLUDE_DIRS}  ${GLUT_INCLUDE_DIRS} ${PNG_INCLUDE_DIRS} )
target_link_libraries(ray_marching ${OPENGL_LIBRARIES} ${GLUT_LIBRARY} ${GLEW_LIBRARY} ${PNG_LIBRARY})