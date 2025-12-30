import React from 'react';
import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { AdvancedImage } from '@cloudinary/react';

// O componente recebe o ID da imagem como propriedade
const CloudinaryImage = ({ publicId }) => {
  
  // Se não tiver ID, não renderiza nada ou retorna um placeholder
  if (!publicId) return null;

  const cld = new Cloudinary({ cloud: { cloudName: 'dovuk0ozg' } });
  
  // Aqui está a mágica: usamos o publicId dinâmico ao invés do exemplo estático
  const img = cld
        .image(publicId) 
        .format('auto') 
        .quality('auto')
        .resize(auto().gravity(autoGravity()).width(500).height(500));

  return (<AdvancedImage cldImg={img}/>);
};

export default CloudinaryImage;