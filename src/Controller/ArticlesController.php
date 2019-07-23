<?php
// src/Controller/LuckyController.php
namespace App\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class ArticlesController extends AbstractController
{ 
	/**
	* @Route("/articles/{slug}")
	*/
	public function homeAction($slug, Request $request)
	{
		$variables = [];
		$variables['title'] = urlencode ('Conduction');
		$variables['url'] = urlencode ($request->getUri()); 
		$variables['twitter_handle'] = urlencode ('conduction_nl');
		$variables['hash_tags'] = urlencode ('conduction,commonground');
		/*  foutafahndeling */
		return $this->render('articles/'.$slug.'.html.twig', $variables);
	}
}
