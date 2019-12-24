#ifndef READPNG_H
#define READPNG_H

#include <png.h>
#include <string>

struct PngImage {
    png_uint_32 width = 0;
    png_uint_32 height = 0;
    png_bytep data = nullptr;
};

PngImage read_png_file(const std::string &filename);

#endif
