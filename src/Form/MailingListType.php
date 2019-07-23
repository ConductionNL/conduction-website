<?php
// src/Form/AmbtenaarType.php
namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\FormBuilderInterface;


class MailingListType extends AbstractType
{
	public function buildForm(FormBuilderInterface $builder, array $options)
	{
		$builder
		->add('email', MailType::class, [
				'attr' => ['class' => 'form-control'],
				'label' => 'E-Mail addres',
				'label_attr' => ['class' => 'control-label col-sm-2'],
				'required'   => true,
				'empty_data' => '563935704',
				
		])
		->add('aanmelden', SubmitType::class, [
				'attr' => ['class' => 'btn btn-primary'],
				'label' => 'Aanmelden'
		])
		;
	}
}
